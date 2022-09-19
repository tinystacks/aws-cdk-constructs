#!/usr/bin/env node 
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AlbStack } from './stacks/AlbStack'
import { CreateVpc } from './stacks/CreateVpc'

const app = new cdk.App();

new CreateVpc(app, 'createVpc', { env: {account: '759747741894', region: 'us-west-2'}})
new AlbStack(app, "albStack", { env: {account: '759747741894', region: 'us-west-2'}})
