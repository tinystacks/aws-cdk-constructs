import { allocateCidrBlock } from "../../src/utils/allocate-cidr";

describe('Allocate CIDR Block', () => {
  it('returns same cidr block given the same seed value', () => {
    const firstResponse = allocateCidrBlock({
      seed: 'seed'
    });
    const secondResponse = allocateCidrBlock({
      seed: 'seed'
    });
    expect(secondResponse).toEqual(firstResponse);
  });
  it('skips to next random number for int hash if the generated cidr is in the exclusions list', () => {
    const excludedCidr = '10.19.0.0/16';
    const response = allocateCidrBlock({
      seed: 'seed',
      exclusions: [excludedCidr]
    });
    
    expect(response.cidrBlock).not.toEqual(excludedCidr);
  });
  it('moves int has based on network mask', () => {
    const response16 = allocateCidrBlock({
      seed: 'seed'
    });
    expect(response16.cidrBlock).toEqual('10.19.0.0/16');
    
    const response18 = allocateCidrBlock({
      seed: 'seed',
      networkMask: 18
    });
    expect(response18.cidrBlock).toEqual('10.0.19.0/18');
    
    const response24 = allocateCidrBlock({
      seed: 'seed',
      networkMask: 24
    });
    expect(response24.cidrBlock).toEqual('10.0.0.19/24');
  });
  it('throws an error if the seed is not valid', () => {
    let thrownError;
    try {
      allocateCidrBlock({
        seed: ''
      });
    } catch (error) {
      thrownError = error;
    } finally {
      expect(thrownError).toBeDefined();
      expect(thrownError).toHaveProperty('message', 'Invalid value: ; "seed" argument must be a string with length greater than zero!');
    }
  });
  it('throws an error if the prefix is not valid', () => {
    let thrownError;
    try {
      allocateCidrBlock({
        seed: 'seed',
        prefix: '124'
      });
    } catch (error) {
      thrownError = error;
    } finally {
      expect(thrownError).toBeDefined();
      expect(thrownError).toHaveProperty('message', 'Invalid value: 124; "prefix" argument must be a valid IPv4 address!');
    }
  });
  it('throws an error if the networkMask is not valid', () => {
    let thrownError;
    try {
      allocateCidrBlock({
        seed: 'seed',
        networkMask: 45
      });
    } catch (error) {
      thrownError = error;
    } finally {
      expect(thrownError).toBeDefined();
      expect(thrownError).toHaveProperty('message', 'Invalid value: 45; "networkMask" argument must be an integer between 8 and 32!');
    }
  });
  it('throws an error if any exclusion is not a valid cidr', () => {
    let thrownError;
    try {
      allocateCidrBlock({
        seed: 'seed',
        exclusions: ['10.19.0.0/16', '10.0.0.0/6']
      });
    } catch (error) {
      thrownError = error;
    } finally {
      expect(thrownError).toBeDefined();
      expect(thrownError).toHaveProperty('message', 'Invalid exclusion value: 10.0.0.0/6; an exclusion must be a valid IPv4 CIDR Block!');
    }
  });
});