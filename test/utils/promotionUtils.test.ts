/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from '@oclif/test';
import sinon from 'sinon';
import { Connection } from '@salesforce/core';
import { validatePromotion, hasSharedComponents } from '../../src/utils/promotionUtils.js';
import { normalizeSalesforceId } from '../../src/utils/soqlUtils.js';

describe('normalizeSalesforceId', () => {
  it('returns a 15-char ID unchanged', () => {
    expect(normalizeSalesforceId('1fkxx0000000001')).to.equal('1fkxx0000000001');
  });

  it('trims an 18-char ID to 15 chars', () => {
    expect(normalizeSalesforceId('1fkWt000000hGr7IAE')).to.equal('1fkWt000000hGr7');
  });
});

describe('hasSharedComponents', () => {
  it('returns false when combineDetails is null', () => {
    expect(hasSharedComponents(null)).to.be.false;
  });

  it('returns false when sharedComponentsList is missing', () => {
    expect(hasSharedComponents({ parentWorkitemId: '1fk000000000001' })).to.be.false;
  });

  it('returns false when sharedComponentsList is empty', () => {
    expect(hasSharedComponents({ sharedComponentsList: {} })).to.be.false;
  });

  it('returns true when sharedComponentsList has entries', () => {
    expect(hasSharedComponents({ sharedComponentsList: { 'WI-000122,WI-000136': ['HelloMCP2:ApexClass'] } })).to.be
      .true;
  });
});

describe('validatePromotion', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');
  });

  afterEach(() => {
    sinon.restore();
  });

  const successResponse = {
    success: true,
    errorType: null,
    errorDetails: null,
    combineDetails: null,
  };

  it('omits checkCombineDetails from request body when false (default)', async () => {
    (connectionStub.request as sinon.SinonStub).resolves(successResponse);

    await validatePromotion(connectionStub, 'PIPE001', ['1fkxx0000000001'], '1QVxx0000000003');

    const body = JSON.parse((connectionStub.request as sinon.SinonStub).firstCall.args[0].body as string);
    expect(body).to.not.have.property('checkCombineDetails');
  });

  it('omits checkCombineDetails from request body when explicitly false', async () => {
    (connectionStub.request as sinon.SinonStub).resolves(successResponse);

    await validatePromotion(
      connectionStub,
      'PIPE001',
      ['1fkxx0000000001'],
      '1QVxx0000000003',
      false
    );

    const body = JSON.parse((connectionStub.request as sinon.SinonStub).firstCall.args[0].body as string);
    expect(body).to.not.have.property('checkCombineDetails');
  });

  it('includes checkCombineDetails: true in request body when explicitly true', async () => {
    (connectionStub.request as sinon.SinonStub).resolves(successResponse);

    await validatePromotion(
      connectionStub,
      'PIPE001',
      ['1fkxx0000000001'],
      '1QVxx0000000003',
      true
    );

    const body = JSON.parse((connectionStub.request as sinon.SinonStub).firstCall.args[0].body as string);
    expect(body.checkCombineDetails).to.be.true;
  });

  it('sends correct endpoint and base payload', async () => {
    (connectionStub.request as sinon.SinonStub).resolves(successResponse);

    await validatePromotion(
      connectionStub,
      'PIPE001',
      ['1fkxx0000000001', '1fkxx0000000002'],
      '1QVxx0000000003'
    );

    const call = (connectionStub.request as sinon.SinonStub).firstCall.args[0];
    expect(call.method).to.equal('POST');
    expect(call.url).to.include('/connect/devops/pipelines/PIPE001/validatePromote');
    const body = JSON.parse(call.body as string);
    expect(body.selectedWorkItemIds).to.deep.equal(['1fkxx0000000001', '1fkxx0000000002']);
    expect(body.targetStageId).to.equal('1QVxx0000000003');
    expect(body.allWorkItemsInStage).to.be.false;
  });

  it('sends allWorkItemsInStage: true when explicitly set', async () => {
    (connectionStub.request as sinon.SinonStub).resolves(successResponse);

    await validatePromotion(
      connectionStub,
      'PIPE001',
      ['1fkxx0000000001'],
      '1QVxx0000000003',
      false,
      true
    );

    const body = JSON.parse((connectionStub.request as sinon.SinonStub).firstCall.args[0].body as string);
    expect(body.allWorkItemsInStage).to.be.true;
  });

  it('trims 18-char IDs to 15 chars in the request body', async () => {
    (connectionStub.request as sinon.SinonStub).resolves(successResponse);

    await validatePromotion(
      connectionStub,
      'PIPE001',
      ['1fkWt000000hGr7IAE'],
      '1QVWt000000G3huOAC'
    );

    const body = JSON.parse((connectionStub.request as sinon.SinonStub).firstCall.args[0].body as string);
    expect(body.selectedWorkItemIds).to.deep.equal(['1fkWt000000hGr7']);
    expect(body.targetStageId).to.equal('1QVWt000000G3hu');
  });

  it('returns mapped result from API response', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({
      success: false,
      errorType: 'COMBINE_REQUIRED',
      errorDetails: 'Work items must be combined',
      combineDetails: { items: ['1fkxx0000000001'] },
    });

    const result = await validatePromotion(
      connectionStub,
      'PIPE001',
      ['1fkxx0000000001'],
      '1QVxx0000000003',
      true
    );

    expect(result.success).to.be.false;
    expect(result.errorType).to.equal('COMBINE_REQUIRED');
    expect(result.errorDetails).to.equal('Work items must be combined');
    expect(result.combineDetails).to.deep.equal({ items: ['1fkxx0000000001'] });
  });
});
