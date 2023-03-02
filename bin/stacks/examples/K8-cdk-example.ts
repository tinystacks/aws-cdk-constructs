#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksStack } from './EksStack'
import { CreateAlb } from './CreateAlb';

const app = new cdk.App();

// assuming peering vpc already exists
const vpcId = "vpc-06ee3bf86858b4518"
// create eks stack with peer vpc example

const eksStack = new EksStack(app, "eksStack", { env: { account: '759747741894', region: 'us-east-1' }, internetAccess: true, externalPeers: [{vpcId: vpcId, cidrBlock: "10.0.10.0/24"}] })

new CreateAlb(app, 'createAlb',  { env: { account: '759747741894', region: 'us-west-2' }, vpcId: vpcId, clusterName: eksStack.cluster.clusterName })
