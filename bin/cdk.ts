#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EKS } from '../src/constructs/compute/eks-cluster'
import { VPC } from '../src/constructs/networking/vpc'
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { IVpc } from 'aws-cdk-lib/aws-ec2';

const app = new cdk.App();



export class testEks extends cdk.Stack {
  private _vpc: IVpc
  private _eksCluster: EKS


  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this._vpc = ec2.Vpc.fromLookup(this, "vpcLookup", {
      vpcId: new VPC(this, "vpc", {
        internetAccess: true
      }).vpc.vpcId
    })

    this._eksCluster = new EKS(this, "testCluster", {
      vpc: this._vpc,
      internetAccess: true
    })

    // new eks.EKS(app, "testCluster" ,{
    //   vpc
    // })
  }
}

new testEks(app, "testEKs");