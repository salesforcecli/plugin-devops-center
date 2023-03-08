/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */

import { expect, test } from '@oclif/test';
import * as sinon from 'sinon';
import { Messages, Org } from '@salesforce/core';
import { CliUx } from '@oclif/core';
import { Optional } from '@salesforce/ts-types';
import {
  ChangeBundleInstall,
  NamedCredential,
  WorkItem,
  WorkItemPromote,
  DeployComponent,
} from '../../../src/common/types';
import * as DeploySelector from '../../../src/common/selectors/deployProgressSummarySelector';
import { AsyncOperationType } from '../../../src/common/constants';
import * as EndpointSelector from '../../../src/common/selectors/namedCredentialSelector';
import * as StageSelector from '../../../src/common/selectors/environmentSelector';
import * as WorkItemSelector from '../../../src/common/selectors/workItemSelector';
import { AbstractPromoteOutputService, DeploySummaryBuilder } from '../../../src/common/outputService';
import * as deployComponentsSelector from '../../../src/common/selectors/deployComponentsSelector';

Messages.importMessagesDirectory(__dirname);
const tableElements = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.pipeline');

class PromoteOutputServiceTest extends AbstractPromoteOutputService {}

describe('promoteOutputService', () => {
  let sandbox: sinon.SinonSandbox;
  const stubOrg = sinon.createStubInstance(Org);
  const summaryBuilder: DeploySummaryBuilder = new DeploySummaryBuilder(stubOrg.getConnection());

  const branchName = 'testing';

  describe('async output', () => {
    const outputService: PromoteOutputServiceTest = new PromoteOutputServiceTest(
      {
        async: true,
        branch: branchName,
      },
      summaryBuilder,
      stubOrg.getConnection()
    );

    test.stdout().it('prints the async deploy execution correctly', async (ctx) => {
      const mockId = 'ABC';
      outputService.setAorId(mockId);
      await outputService.printOpSummary();
      expect(ctx.stdout).to.contain('Deploy has been queued.');
      expect(ctx.stdout).to.contain(`Run "sf deploy pipeline resume --job-id ${mockId} to resume watching the deploy.`);
      expect(ctx.stdout).to.contain(`Run "sf deploy pipeline report --job-id ${mockId} to get the latest status.`);
    });
  });

  describe('displayEndResults', () => {
    const outputService: PromoteOutputServiceTest = new PromoteOutputServiceTest(
      {
        branch: branchName,
        verbose: true,
      },
      summaryBuilder,
      stubOrg.getConnection()
    );

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    test.it('prints a table when verbose flag exists', async () => {
      const deployed: DeployComponent = {
        sf_devops__Source_Component__c: 'ApexClass:foo',
        sf_devops__Operation__c: 'add',
        sf_devops__File_Path__c: 'path',
        Type: 'ApexClass',
        Name: 'foo',
      };

      const deployedComponents: DeployComponent[] = new Array(deployed);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(deployComponentsSelector, 'selectDeployComponentsByAsyncOpId').resolves(deployedComponents);

      const logSpy = sandbox.spy(CliUx.ux, 'log');

      // As styleHeader and table are readonly properties we need to stub them if a different way
      let styledHeaderRetVal: Optional<string>;
      const styledHeaderGetter = () => (x: string) => (styledHeaderRetVal = x);
      sandbox.stub(CliUx.ux, 'styledHeader').get(styledHeaderGetter);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tableRetVal: any = {};
      const tableGetter = () => (x: Record<string, unknown>) => (tableRetVal = x);
      sandbox.stub(CliUx.ux, 'table').get(tableGetter);

      outputService.setAorId('aorID');
      await outputService.displayEndResults();
      expect(logSpy.called).to.equal(true);
      expect(styledHeaderRetVal).to.deep.equal(tableElements.getMessage('deployComponent.table.title'));
      expect(tableRetVal).to.deep.equal(deployedComponents);
    });
  });

  describe('deployment', () => {
    let outputService: PromoteOutputServiceTest;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      outputService = getOutputService(false);
    });

    afterEach(() => {
      sandbox.restore();
    });

    const workItem1Name = 'WI1';
    const workItem2Name = 'WI2';
    const stageName = 'UAT';
    const orgUrl = 'www.example.com';

    const namedCredential: NamedCredential = {
      Endpoint: orgUrl,
    };

    test
      .stdout()
      .it('ignores a print deploy summary with a deployment that is not soup, versioned or ad hoc', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(DeploySelector, 'selectDeployAORSummaryDataById').resolves({
          sf_devops__Work_Item_Promotes__r: null,
          sf_devops__Change_Bundle_Installs__r: null,
          sf_devops__Work_Items__r: null,
          sf_devops__Operation__c: null,
        });
        await outputService.printOpSummary();
        expect(ctx.stdout).to.be.empty;
      });

    describe('ad hoc deployment', () => {
      function mockWorkItemPromote(name: string, stage: string, envNamedCredential: string): WorkItemPromote {
        return {
          sf_devops__Pipeline_Stage__r: {
            Id: 'S',
            Name: stage,
            sf_devops__Branch__r: {
              sf_devops__Name__c: 'NotThisBranch',
            },
            sf_devops__Pipeline__r: {
              sf_devops__Project__c: 'AProject',
            },
            sf_devops__Pipeline_Stages__r: undefined,
            sf_devops__Environment__r: {
              Id: 'E',
              sf_devops__Named_Credential__c: envNamedCredential,
            },
          },
          sf_devops__Work_Item__r: {
            Name: name,
          },
        };
      }

      const mockWorkItemPromote1: WorkItemPromote = mockWorkItemPromote(workItem1Name, stageName, 'ABC');
      const mockWorkItemPromote2: WorkItemPromote = mockWorkItemPromote(workItem2Name, stageName, 'ABC');

      async function adHocDeploy(
        workItemsPromote: WorkItemPromote[],
        outputServiceParam: PromoteOutputServiceTest
      ): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(DeploySelector, 'selectDeployAORSummaryDataById').resolves({
          sf_devops__Work_Item_Promotes__r: {
            done: true,
            totalSize: workItemsPromote.length,
            records: workItemsPromote,
          },
          sf_devops__Change_Bundle_Installs__r: null,
          sf_devops__Work_Items__r: null,
          sf_devops__Operation__c: AsyncOperationType.AD_HOC_PROMOTE,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(EndpointSelector, 'selectNamedCredentialByName').resolves(namedCredential);
        await outputServiceParam.printOpSummary();
      }

      test.stdout().it('prints the correct message for a single WI ad hoc deployment', async (ctx) => {
        const workItemsPromote: WorkItemPromote[] = [mockWorkItemPromote1];
        await adHocDeploy(workItemsPromote, outputService);
        expect(ctx.stdout).to.contain(
          `DevOps Center pipeline stage ${stageName} being updated with metadata associated with work item ${workItem1Name}.`
        );
        expect(ctx.stdout).to.contain(`Deploying metadata from ${branchName} branch to target org ${orgUrl}.`);
      });

      test.stdout().it('prints the correct message for a multiple WIs ad hoc deployment', async (ctx) => {
        const workItemsPromote: WorkItemPromote[] = [mockWorkItemPromote1, mockWorkItemPromote2];
        await adHocDeploy(workItemsPromote, outputService);
        expect(ctx.stdout).to.contain(
          `DevOps Center pipeline stage ${stageName} being updated with metadata associated with work items ${workItem1Name}, ${workItem2Name}.`
        );
        expect(ctx.stdout).to.contain(`Deploying metadata from ${branchName} branch to target org ${orgUrl}.`);
      });

      test.stdout().it('prints the correct message for concise flag for adHoc', async (ctx) => {
        outputService = getOutputService(true);
        const workItemsPromote: WorkItemPromote[] = [mockWorkItemPromote1, mockWorkItemPromote2];
        await adHocDeploy(workItemsPromote, outputService);
        expect(ctx.stdout).to.contain(
          `DevOps Center pipeline stage ${stageName} being updated. Deploying metadata from ${branchName} branch to target org ${orgUrl}.`
        );
      });
    });

    function mockChangeBundleInstall(id: string, versionName: string, envNamedCredential: string): ChangeBundleInstall {
      return {
        sf_devops__Environment__r: {
          Id: 'E',
          sf_devops__Named_Credential__c: envNamedCredential,
        },
        sf_devops__Change_Bundle__r: {
          Id: id,
          sf_devops__Version_Name__c: versionName,
        },
      };
    }

    const changeBundleInstall1VersionName = '1.0';
    const changeBundleInstall1Id = 'CB1';

    const mockChangeBunldeInstall1: ChangeBundleInstall = mockChangeBundleInstall(
      changeBundleInstall1Id,
      changeBundleInstall1VersionName,
      'ABC'
    );
    const mockChangeBunldeInstall2: ChangeBundleInstall = mockChangeBundleInstall(
      changeBundleInstall1Id,
      changeBundleInstall1VersionName,
      'DEF'
    );

    const workItem1 = {
      Name: workItem1Name,
    };
    const workItem2 = {
      Name: workItem2Name,
    };

    describe('soup deployment', () => {
      const changeBundleInstalls: ChangeBundleInstall[] = [mockChangeBunldeInstall1, mockChangeBunldeInstall2];
      const workItems: WorkItem[] = [workItem1, workItem2];

      beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(DeploySelector, 'selectDeployAORSummaryDataById').resolves({
          sf_devops__Work_Item_Promotes__r: null,
          sf_devops__Change_Bundle_Installs__r: {
            done: true,
            totalSize: changeBundleInstalls.length,
            records: changeBundleInstalls,
          },
          sf_devops__Work_Items__r: {
            done: true,
            totalSize: workItems.length,
            records: workItems,
          },
          sf_devops__Operation__c: AsyncOperationType.SOUP_PROMOTE,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(EndpointSelector, 'selectNamedCredentialByName').resolves(namedCredential);

        sandbox.stub(StageSelector, 'selectPipelineStageByEnvironment').resolves({
          sf_devops__Named_Credential__c: 'ABC',
          sf_devops__Pipeline_Stages__r: {
            done: true,
            totalSize: 1,
            records: [
              {
                Id: 'S',
                Name: stageName,
                sf_devops__Branch__r: {
                  sf_devops__Name__c: 'NotUsed',
                },
                sf_devops__Pipeline__r: {
                  sf_devops__Project__c: 'AProject',
                },
                sf_devops__Pipeline_Stages__r: undefined,
                sf_devops__Environment__r: {
                  Id: 'E',
                  sf_devops__Named_Credential__c: 'ABC',
                },
              },
            ],
          },
        });
      });

      test.stdout().it('prints the correct message for a soup deployment', async (ctx) => {
        await outputService.printOpSummary();
        expect(ctx.stdout).to.contain(
          `DevOps Center pipeline stage ${stageName} being updated with metadata associated with work items ${workItem1Name}, ${workItem2Name} in bundle ${changeBundleInstall1VersionName}.`
        );
        expect(ctx.stdout).to.contain(`Deploying metadata from ${branchName} branch to target org ${orgUrl}.`);
      });

      test.stdout().it('prints the correct message for concise flag for soup', async (ctx) => {
        outputService = getOutputService(true);
        await outputService.printOpSummary();
        expect(ctx.stdout).to.contain(
          `DevOps Center pipeline stage ${stageName} being updated. Deploying metadata from ${branchName} branch to target org ${orgUrl}.`
        );
      });
    });

    describe('versioned deployment', () => {
      const changeBundleInstall2VersionName = '2.0';
      const changeBundleInstall2Id = 'CB2';

      const mockChangeBunldeInstall3: ChangeBundleInstall = mockChangeBundleInstall(
        changeBundleInstall2Id,
        changeBundleInstall2VersionName,
        'ABC'
      );

      const workItem3Name = 'WI3';
      const workItem4Name = 'WI4';

      const workItem3 = {
        Name: workItem3Name,
      };
      const workItem4 = {
        Name: workItem4Name,
      };

      const changeBundleInstalls: ChangeBundleInstall[] = [mockChangeBunldeInstall1, mockChangeBunldeInstall3];

      const workItems1 = [workItem1, workItem2];
      const workItems2 = [workItem3];
      const workItems3 = [workItem4];

      beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(DeploySelector, 'selectDeployAORSummaryDataById').resolves({
          sf_devops__Work_Item_Promotes__r: null,
          sf_devops__Change_Bundle_Installs__r: {
            done: true,
            totalSize: changeBundleInstalls.length,
            records: changeBundleInstalls,
            nextRecordsUrl: undefined,
          },
          sf_devops__Work_Items__r: null,
          sf_devops__Operation__c: AsyncOperationType.VERSIONED_PROMOTE,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(EndpointSelector, 'selectNamedCredentialByName').resolves(namedCredential);

        sandbox.stub(StageSelector, 'selectPipelineStageByEnvironment').resolves({
          sf_devops__Named_Credential__c: 'ABC',
          sf_devops__Pipeline_Stages__r: {
            done: true,
            totalSize: 1,
            records: [
              {
                Id: 'S',
                Name: stageName,
                sf_devops__Branch__r: {
                  sf_devops__Name__c: 'NotUsed',
                },
                sf_devops__Pipeline__r: {
                  sf_devops__Project__c: 'AProject',
                },
                sf_devops__Pipeline_Stages__r: undefined,
                sf_devops__Environment__r: {
                  Id: 'E',
                  sf_devops__Named_Credential__c: 'ABC',
                },
              },
            ],
          },
        });

        sandbox.stub(WorkItemSelector, 'selectWorkItemsByChangeBundles').resolves([
          {
            Id: changeBundleInstall1Id,
            sf_devops__Work_Items__r: {
              done: true,
              totalSize: workItems1.length,
              records: workItems1,
            },
          },
          {
            Id: changeBundleInstall2Id,
            sf_devops__Work_Items__r: {
              done: true,
              totalSize: workItems2.length,
              records: workItems2,
            },
          },
          {
            Id: 'NotUsed',
            sf_devops__Work_Items__r: {
              done: true,
              totalSize: workItems3.length,
              records: workItems3,
            },
          },
        ]);
      });

      test.stdout().it('prints the correct message for a versioned deployment', async (ctx) => {
        await outputService.printOpSummary();
        expect(ctx.stdout).to.contain(
          `DevOps Center pipeline stage ${stageName} being updated with metadata associated with work items ${workItem1Name}, ${workItem2Name} in bundle ${changeBundleInstall1VersionName}; work item ${workItem3Name} in bundle ${changeBundleInstall2VersionName}.`
        );
        expect(ctx.stdout).to.contain(`Deploying metadata from ${branchName} branch to target org ${orgUrl}.`);
      });

      test.stdout().it('prints the correct message for concise flag for versioned', async (ctx) => {
        outputService = getOutputService(true);
        await outputService.printOpSummary();
        expect(ctx.stdout).to.contain(
          `DevOps Center pipeline stage ${stageName} being updated. Deploying metadata from ${branchName} branch to target org ${orgUrl}.`
        );
      });
    });
  });

  function getOutputService(concise: boolean): PromoteOutputServiceTest {
    return new PromoteOutputServiceTest(
      {
        branch: branchName,
        concise,
      },
      summaryBuilder,
      stubOrg.getConnection()
    );
  }
});
