#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';


import { StitcherCdkSourceStack } from './stitcher-stack';

const app = new cdk.App();

const cidrBlock = '10.0.0.0/16';
const instanceIdentifier = 'rdsdatabase'

new StitcherCdkSourceStack(app, '40nStitcherStack', { 
  cidrBlock, 
  instanceIdentifier
});