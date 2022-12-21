import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { EKS } from '../../../src/constructs/compute/eks-cluster'
import * as ec2 from 'aws-cdk-lib/aws-ec2';

/*
*This stack gets the VPC ID from ssm and imports the VPC.
*/

interface EksStackProps extends cdk.StackProps {
  vpcSsmParamName: string
  clusterName: string
  internetAccess: boolean
}

export class EksStack extends cdk.Stack {
  private _vpcId: string;
  private _vpc: ec2.IVpc;
  private _eksClusterName: string;
  private _cluster: EKS;

  constructor(scope: cdk.App, id: string, props: EksStackProps) {
    super(scope, id, props);

    const {
      vpcSsmParamName,
      clusterName,
      internetAccess
    } = props
    
    this._eksClusterName = `${id}-${clusterName}`
    this._vpcId = ssm.StringParameter.valueFromLookup(this,
      vpcSsmParamName)
    console.log(`vpc ID: ${this._vpcId}`)

    // get vpc id
    this._vpc = ec2.Vpc.fromLookup(this, "vpcLookup", {
      vpcId: this._vpcId
    })

    //create cluster
    this._cluster = new EKS(this, this._eksClusterName, {
      vpc: this._vpc,
      internetAccess: internetAccess,
      clusterName: this._eksClusterName
    })
  }

  public get clusterNameSsmParamName(): string {
    return this._cluster.clusterNameParameterName
  }
  
}