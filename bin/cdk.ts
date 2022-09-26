#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksStack } from './stacks/EksStack'
import { CreateVpc } from './stacks/CreateVpc'
import { CreateAlb } from './stacks/createAlb';

const app = new cdk.App();

new CreateVpc(app, 'createVpc', { env: { account: '759747741894', region: 'us-west-2' } })
new EksStack(app, "eksStack", { env: { account: '759747741894', region: 'us-west-2' } })

new CreateAlb(app, 'createAlb', { env: { account: '759747741894', region: 'us-west-2' } })
