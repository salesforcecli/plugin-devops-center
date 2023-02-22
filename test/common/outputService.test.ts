/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// import { expect, test } from '@oclif/test';
// import * as sinon from 'sinon';
// import { Org } from '@salesforce/core';
// import { DeployOutputService } from '../../src/common/outputService/deployOutputService';
// import { OutputServiceFactory } from '../../src/common/outputService/outputServiceFactory';
// import { AsyncOperationResult, ChangeBundleInstall, WorkItemPromote } from '../../src/common/types';
// import * as DeploySelector from '../../src/common/selectors/deployProgressSummarySelector';
// import * as EndpointSelector from '../../src/common/selectors/endpointSelector';
// import * as StageSelector from '../../src/common/selectors/environmentSelector';
// import * as ChangeBundleSelector from '../../src/common/selectors/changeBundleSelector';
// import { OutputService } from '../../src/common/outputService/outputService';

// describe('outputService', () => {
//   test.stdout().it('prints the async deploy execution correctly', (ctx) => {
//     const mockId = 'ABC';
//     DeployOutputService.printAsyncRunInfo(mockId);
//     expect(ctx.stdout).to.contain(
//       'Deploy has been queued.\n' +
//         `Run "sf deploy pipeline resume --job-id ${mockId} to resume watching the deploy.\n` +
//         `Run "sf deploy pipeline report --job-id ${mockId} to get the latest status.`
//     );
//   });

//   test.stdout().it('handles the print of an undefined aor status', (ctx) => {
//     const status = undefined;
//     const message = 'This should be printed';
//     const aor: AsyncOperationResult = {
//       Id: 'Id',
//       // eslint-disable-next-line camelcase
//       sf_devops__Error_Details__c: undefined,
//       // eslint-disable-next-line camelcase
//       sf_devops__Status__c: status,
//       // eslint-disable-next-line camelcase
//       sf_devops__Message__c: message,
//     };
//     OutputService.printAorStatus(aor);
//     expect(ctx.stdout).to.contain(message);
//   });

//   test.stdout().it('handles the print of an In Progress aor status', (ctx) => {
//     const status = 'In Progress';
//     const message = 'This should be printed';
//     const aor: AsyncOperationResult = {
//       Id: 'Id',
//       // eslint-disable-next-line camelcase
//       sf_devops__Error_Details__c: undefined,
//       // eslint-disable-next-line camelcase
//       sf_devops__Status__c: status,
//       // eslint-disable-next-line camelcase
//       sf_devops__Message__c: message,
//     };
//     OutputService.printAorStatus(aor);
//     expect(ctx.stdout).to.contain(message);
//   });

//   test.stdout().it('handles the print of a Completed aor status', (ctx) => {
//     const message = 'Deploy complete.';
//     const aor: AsyncOperationResult = {
//       Id: 'Id',
//       // eslint-disable-next-line camelcase
//       sf_devops__Error_Details__c: undefined,
//       // eslint-disable-next-line camelcase
//       sf_devops__Status__c: 'Completed',
//       // eslint-disable-next-line camelcase
//       sf_devops__Message__c: message,
//     };
//     OutputService.printAorStatus(aor);
//     expect(ctx.stdout).to.contain(message);
//   });

//   test.stdout().it('handles the print of an Error aor status', (ctx) => {
//     const status = 'Error';
//     const errorDetails = 'This should be printed';
//     const message = 'This should also be printed';
//     const aor: AsyncOperationResult = {
//       Id: 'Id',
//       // eslint-disable-next-line camelcase
//       sf_devops__Error_Details__c: errorDetails,
//       // eslint-disable-next-line camelcase
//       sf_devops__Status__c: status,
//       // eslint-disable-next-line camelcase
//       sf_devops__Message__c: message,
//     };
//     OutputService.printAorStatus(aor);
//     expect(ctx.stdout).to.contain(errorDetails);
//     expect(ctx.stdout).to.contain(message);
//   });

//   test.stdout().it('ignores an invalid aor status of a deployment when asked to print', (ctx) => {
//     const status = 'Invalid';
//     const aor: AsyncOperationResult = {
//       Id: 'Id',
//       // eslint-disable-next-line camelcase
//       sf_devops__Error_Details__c: undefined,
//       // eslint-disable-next-line camelcase
//       sf_devops__Status__c: status,
//       // eslint-disable-next-line camelcase
//       sf_devops__Message__c: '',
//     };
//     OutputService.printAorStatus(aor);
//     expect(ctx.stdout).to.be.empty;
//   });

//   describe('deployment summary', () => {
//     let sandbox: sinon.SinonSandbox;
//     const stubOrg = sinon.createStubInstance(Org);
//     const outputService: DeployOutputService = OutputServiceFactory.forDeployment(stubOrg.getConnection());

//     beforeEach(() => {
//       sandbox = sinon.createSandbox();
//     });

//     afterEach(() => {
//       sandbox.restore();
//     });

//     const workItem1Name = 'WI1';
//     const workItem2Name = 'WI2';
//     const stageName = 'UAT';
//     const branchName = 'testing';
//     const orgUrl = 'www.example.com';

//     test
//       .stdout()
//       .it('ignores a print deploy summary with a deployment that is not soup, versioned or ad hoc', async (ctx) => {
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         sandbox.stub(DeploySelector, 'selectDeployAORSummaryData').resolves({
//           // eslint-disable-next-line camelcase
//           sf_devops__Work_Item_Promotes__r: null,
//           // eslint-disable-next-line camelcase
//           sf_devops__Change_Bundle_Installs__r: null,
//         });
//         await outputService.printProgressSummary('1234', branchName);
//         expect(ctx.stdout).to.be.empty;
//       });

//     describe('ad hoc deployment', () => {
//       function mockWorkItemPromote(name: string, stage: string, envNamedCredential: string): WorkItemPromote {
//         return {
//           // eslint-disable-next-line camelcase
//           sf_devops__Pipeline_Stage__r: {
//             Id: 'S',
//             Name: stage,
//             // eslint-disable-next-line camelcase
//             sf_devops__Branch__r: {
//               // eslint-disable-next-line camelcase
//               sf_devops__Name__c: 'NotThisBranch',
//             },
//             // eslint-disable-next-line camelcase
//             sf_devops__Pipeline__r: {
//               // eslint-disable-next-line camelcase
//               sf_devops__Project__c: 'AProject',
//             },
//             // eslint-disable-next-line camelcase
//             sf_devops__Pipeline_Stages__r: undefined,
//             // eslint-disable-next-line camelcase
//             sf_devops__Environment__r: {
//               Id: 'E',
//               // eslint-disable-next-line camelcase
//               sf_devops__Named_Credential__c: envNamedCredential,
//             },
//           },
//           // eslint-disable-next-line camelcase
//           sf_devops__Work_Item__r: {
//             Name: name,
//           },
//         };
//       }

//       const mockWorkItemPromote1: WorkItemPromote = mockWorkItemPromote(workItem1Name, stageName, 'ABC');
//       const mockWorkItemPromote2: WorkItemPromote = mockWorkItemPromote(workItem2Name, stageName, 'ABC');

//       async function adHocDeploy(workItemsPromote: WorkItemPromote[]): Promise<void> {
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         sandbox.stub(DeploySelector, 'selectDeployAORSummaryData').resolves({
//           // eslint-disable-next-line camelcase
//           sf_devops__Work_Item_Promotes__r: {
//             done: true,
//             totalSize: workItemsPromote.length,
//             records: workItemsPromote,
//             nextRecordsUrl: undefined,
//           },
//           // eslint-disable-next-line camelcase
//           sf_devops__Change_Bundle_Installs__r: null,
//         });
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         sandbox.stub(EndpointSelector, 'selectOrgUrl').resolves(orgUrl);
//         await outputService.printProgressSummary('1234', branchName);
//       }

//       test.stdout().it('prints the correct message for a single WI ad hoc deployment', async (ctx) => {
//         const workItemsPromote: WorkItemPromote[] = [mockWorkItemPromote1];
//         await adHocDeploy(workItemsPromote);
//         expect(ctx.stdout).to.contain(
//           `DevOps Center pipeline stage ${stageName} being updated with metadata associated with work item ` +
//             `${workItem1Name}. Deploying metadata from ${branchName} branch to target org ${orgUrl}.`
//         );
//       });

//       test.stdout().it('prints the correct message for a multiple WIs ad hoc deployment', async (ctx) => {
//         const workItemsPromote: WorkItemPromote[] = [mockWorkItemPromote1, mockWorkItemPromote2];
//         await adHocDeploy(workItemsPromote);
//         expect(ctx.stdout).to.contain(
//           `DevOps Center pipeline stage ${stageName} being updated with metadata associated with work items ` +
//             `${workItem1Name}, ${workItem2Name}. Deploying metadata from ${branchName} branch to target org ${orgUrl}.`
//         );
//       });
//     });

//     function mockChangeBundleInstall(id: string, versionName: string, envNamedCredential: string): ChangeBundleInstall {
//       return {
//         // eslint-disable-next-line camelcase
//         sf_devops__Environment__r: {
//           Id: 'E',
//           // eslint-disable-next-line camelcase
//           sf_devops__Named_Credential__c: envNamedCredential,
//         },
//         // eslint-disable-next-line camelcase
//         sf_devops__Change_Bundle__r: {
//           Id: id,
//           // eslint-disable-next-line camelcase
//           sf_devops__Version_Name__c: versionName,
//         },
//       };
//     }

//     const changeBundleInstall1VersionName = '1.0';
//     const changeBundleInstall1Id = 'CB1';

//     const mockChangeBunldeInstall1: ChangeBundleInstall = mockChangeBundleInstall(
//       changeBundleInstall1Id,
//       changeBundleInstall1VersionName,
//       'ABC'
//     );
//     const mockChangeBunldeInstall2: ChangeBundleInstall = mockChangeBundleInstall(
//       changeBundleInstall1Id,
//       changeBundleInstall1VersionName,
//       'DEF'
//     );

//     const workItem1 = {
//       Name: workItem1Name,
//     };
//     const workItem2 = {
//       Name: workItem2Name,
//     };

//     describe('soup deployment', () => {
//       test.stdout().it('prints the correct message for a soup deployment', async (ctx) => {
//         const changeBundleInstalls: ChangeBundleInstall[] = [mockChangeBunldeInstall1, mockChangeBunldeInstall2];
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         sandbox.stub(DeploySelector, 'selectDeployAORSummaryData').resolves({
//           // eslint-disable-next-line camelcase
//           sf_devops__Work_Item_Promotes__r: null,
//           // eslint-disable-next-line camelcase
//           sf_devops__Change_Bundle_Installs__r: {
//             done: true,
//             totalSize: changeBundleInstalls.length,
//             records: changeBundleInstalls,
//             nextRecordsUrl: undefined,
//           },
//         });

//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         sandbox.stub(EndpointSelector, 'selectOrgUrl').resolves(orgUrl);

//         sandbox.stub(StageSelector, 'selectPipelineStageByEnvironment').resolves({
//           // eslint-disable-next-line camelcase
//           sf_devops__Named_Credential__c: 'ABC',
//           // eslint-disable-next-line camelcase
//           sf_devops__Pipeline_Stages__r: {
//             done: true,
//             totalSize: 1,
//             records: [
//               {
//                 Id: 'S',
//                 Name: stageName,
//                 // eslint-disable-next-line camelcase
//                 sf_devops__Branch__r: {
//                   // eslint-disable-next-line camelcase
//                   sf_devops__Name__c: 'NotUsed',
//                 },
//                 // eslint-disable-next-line camelcase
//                 sf_devops__Pipeline__r: {
//                   // eslint-disable-next-line camelcase
//                   sf_devops__Project__c: 'AProject',
//                 },
//                 // eslint-disable-next-line camelcase
//                 sf_devops__Pipeline_Stages__r: undefined,
//                 // eslint-disable-next-line camelcase
//                 sf_devops__Environment__r: {
//                   Id: 'E',
//                   // eslint-disable-next-line camelcase
//                   sf_devops__Named_Credential__c: 'ABC',
//                 },
//               },
//             ],
//           },
//         });

//         const workItems = [workItem1, workItem2];
//         sandbox.stub(ChangeBundleSelector, 'selectWorkItemsByChangeBundles').resolves([
//           {
//             Id: changeBundleInstall1Id,
//             // eslint-disable-next-line camelcase
//             sf_devops__Work_Items__r: {
//               done: true,
//               totalSize: workItems.length,
//               records: workItems,
//             },
//           },
//         ]);

//         await outputService.printProgressSummary('1234', branchName);
//         expect(ctx.stdout).to.contain(
//           `DevOps Center pipeline stage ${stageName} being updated with metadata associated with work items ` +
//             `${workItem1Name}, ${workItem2Name} in bundle ${changeBundleInstall1VersionName}. Deploying metadata from ${branchName} branch to target org ${orgUrl}.`
//         );
//       });
//     });

//     describe('versioned deployment', () => {
//       const changeBundleInstall2VersionName = '2.0';
//       const changeBundleInstall2Id = 'CB2';

//       const mockChangeBunldeInstall3: ChangeBundleInstall = mockChangeBundleInstall(
//         changeBundleInstall2Id,
//         changeBundleInstall2VersionName,
//         'ABC'
//       );

//       const workItem3Name = 'WI3';
//       const workItem4Name = 'WI4';

//       const workItem3 = {
//         Name: workItem3Name,
//       };
//       const workItem4 = {
//         Name: workItem4Name,
//       };

//       test.stdout().it('prints the correct message for a versioned deployment', async (ctx) => {
//         const changeBundleInstalls: ChangeBundleInstall[] = [mockChangeBunldeInstall1, mockChangeBunldeInstall3];
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         sandbox.stub(DeploySelector, 'selectDeployAORSummaryData').resolves({
//           // eslint-disable-next-line camelcase
//           sf_devops__Work_Item_Promotes__r: null,
//           // eslint-disable-next-line camelcase
//           sf_devops__Change_Bundle_Installs__r: {
//             done: true,
//             totalSize: changeBundleInstalls.length,
//             records: changeBundleInstalls,
//             nextRecordsUrl: undefined,
//           },
//         });

//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         sandbox.stub(EndpointSelector, 'selectOrgUrl').resolves(orgUrl);

//         sandbox.stub(StageSelector, 'selectPipelineStageByEnvironment').resolves({
//           // eslint-disable-next-line camelcase
//           sf_devops__Named_Credential__c: 'ABC',
//           // eslint-disable-next-line camelcase
//           sf_devops__Pipeline_Stages__r: {
//             done: true,
//             totalSize: 1,
//             records: [
//               {
//                 Id: 'S',
//                 Name: stageName,
//                 // eslint-disable-next-line camelcase
//                 sf_devops__Branch__r: {
//                   // eslint-disable-next-line camelcase
//                   sf_devops__Name__c: 'NotUsed',
//                 },
//                 // eslint-disable-next-line camelcase
//                 sf_devops__Pipeline__r: {
//                   // eslint-disable-next-line camelcase
//                   sf_devops__Project__c: 'AProject',
//                 },
//                 // eslint-disable-next-line camelcase
//                 sf_devops__Pipeline_Stages__r: undefined,
//                 // eslint-disable-next-line camelcase
//                 sf_devops__Environment__r: {
//                   Id: 'E',
//                   // eslint-disable-next-line camelcase
//                   sf_devops__Named_Credential__c: 'ABC',
//                 },
//               },
//             ],
//           },
//         });

//         const workItems1 = [workItem1, workItem2];
//         const workItems2 = [workItem3];
//         const workItems3 = [workItem4];
//         sandbox.stub(ChangeBundleSelector, 'selectWorkItemsByChangeBundles').resolves([
//           {
//             Id: changeBundleInstall1Id,
//             // eslint-disable-next-line camelcase
//             sf_devops__Work_Items__r: {
//               done: true,
//               totalSize: workItems1.length,
//               records: workItems1,
//             },
//           },
//           {
//             Id: changeBundleInstall2Id,
//             // eslint-disable-next-line camelcase
//             sf_devops__Work_Items__r: {
//               done: true,
//               totalSize: workItems2.length,
//               records: workItems2,
//             },
//           },
//           {
//             Id: 'NotUsed',
//             // eslint-disable-next-line camelcase
//             sf_devops__Work_Items__r: {
//               done: true,
//               totalSize: workItems3.length,
//               records: workItems3,
//             },
//           },
//         ]);

//         await outputService.printProgressSummary('1234', branchName);
//         expect(ctx.stdout).to.contain(
//           `DevOps Center pipeline stage ${stageName} being updated with metadata associated with work items ` +
//             `${workItem1Name}, ${workItem2Name} in bundle ${changeBundleInstall1VersionName}; work item ${workItem3Name} in bundle ${changeBundleInstall2VersionName}. ` +
//             `Deploying metadata from ${branchName} branch to target org ${orgUrl}.`
//         );
//       });
//     });
//   });
// });