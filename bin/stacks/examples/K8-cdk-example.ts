#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksStack } from './stacks/EksStack'
import { CreateVpc } from './stacks/CreateVpc'
import { CreateAlb } from './stacks/examples/CreateAlb';

const app = new cdk.App();

const createVpcStack = new CreateVpc(app, 'createVpc', { env: { account: '759747741894', region: 'us-west-2' }, internetAccess: true })
console.log(`outside: ${createVpcStack.ssmParameterName}`)
const eksStackStack = new EksStack(app, "eksStack", { env: { account: '759747741894', region: 'us-west-2' }, vpcSsmParamName: createVpcStack.ssmParameterName, clusterName: "testCluster", internetAccess: createVpcStack.internetAccess })
const createAlbStack = new CreateAlb(app, 'createAlb', { env: { account: '759747741894', region: 'us-west-2' }, vpcSsmParamName: createVpcStack.ssmParameterName,clusterNameSsmParamName: eksStackStack.clusterNameSsmParamName })

// eksStackStack.addDependency(createVpcStack)
// createAlbStack.addDependency(eksStackStack)
// createAlbStack.addDependency(createVpcStack)

