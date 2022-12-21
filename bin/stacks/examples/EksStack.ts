import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { EKS } from '../../../src/constructs/compute/eks-cluster'
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { VPC, ExternalVpcPeer } from '../../../src'

/*
*This stack gets the VPC ID from ssm and imports the VPC.
*/

interface EksStackProps extends cdk.StackProps {
  internetAccess: boolean
  internalPeers?: VPC[]
  externalPeers?: ExternalVpcPeer[]
}

export class EksStack extends cdk.Stack {
  private _vpc: ec2.IVpc;
  private _eksClusterName: string;
  private _cluster: EKS;

  constructor(scope: cdk.App, id: string, props: EksStackProps) {
    super(scope, id, props);

    const {
      internetAccess,
      internalPeers,
      externalPeers
    } = props

    this._eksClusterName = `${id}-eks`

    //create vpc
    this._vpc = new VPC(this, `${id}-vpc`, {internetAccess: internetAccess, internalPeers: internalPeers, externalPeers: externalPeers}).vpc

    //create cluster
    this._cluster = new EKS(this, this._eksClusterName, {
      vpc: this._vpc,
      internetAccess: internetAccess
    })
  }

  public get clusterNameSsmParamName(): string {
    return this._cluster.clusterNameParameterName
  }

  public get cluster(): EKS {
    return this._cluster
  }
  
}