#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksStack } from './EksStack'
import { CreateVpc } from './CreateVpc'
import { CreateAlb } from './CreateAlb';
import { VpcPeeringRoutes } from '../../../src'
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const app = new cdk.App();



//create vpc
const createVpcStack = new CreateVpc(app, 'createVpc', { env: { account: '759747741894', region: 'us-west-2' }, internetAccess: true })
console.log(`outside: ${createVpcStack.ssmParameterName}`)

const vpcId = ssm.StringParameter.valueFromLookup(this,
    createVpcStack.ssmParameterName)

//create peer connection


const eksStackStack = new EksStack(app, "eksStack", { env: { account: '759747741894', region: 'us-west-2' }, vpcSsmParamName: createVpcStack.ssmParameterName, clusterName: "testCluster", internetAccess: createVpcStack.internetAccess })
const createAlbStack = new CreateAlb(app, 'createAlb', { env: { account: '759747741894', region: 'us-west-2' }, vpcSsmParamName: createVpcStack.ssmParameterName,clusterNameSsmParamName: eksStackStack.clusterNameSsmParamName })

// eksStackStack.addDependency(createVpcStack)
// createAlbStack.addDependency(eksStackStack)
// createAlbStack.addDependency(createVpcStack)

