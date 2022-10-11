import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface EksNodegroupProps {
  nodegroupName: string;
  nodeMinSize: number;
  nodeMaxSize: number;
  nodeDesiredSize: number;
  nodeDiskSize: number;
  eksCluster: eks.Cluster;
  managedPolicies: any[];
  subnets: ec2.SubnetSelection;
  tags?: {};
  amiType: eks.NodegroupAmiType;
  instanceTypes: any[];
}

export class EksNodegroup extends Construct {

  public readonly eks_nodegroup: eks.Nodegroup;

  constructor (scope: Construct, id: string, props: EksNodegroupProps) {
    super (scope, id);

    const nodegroupRole = new iam.Role(this, 'eks-nodegroup-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: props.managedPolicies
    });

    props.eksCluster.addNodegroupCapacity ('node-group', {
      nodegroupName: props.nodegroupName,
      minSize: props.nodeMinSize,
      maxSize: props.nodeMaxSize,
      desiredSize: props.nodeDesiredSize,
      diskSize: props.nodeDiskSize,
      subnets: props.subnets,
      tags: props.tags,
      amiType: props.amiType,
      instanceTypes: props.instanceTypes,
      nodeRole: nodegroupRole,
    });

  }
}