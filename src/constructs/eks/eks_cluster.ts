import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eks from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';

export interface EksClusterProps {
  clusterName: string;
  version: eks.KubernetesVersion;
  vpc: ec2.Vpc;
  subnetType: ec2.SubnetType;
  managedPolicies: any[];
}

export class EksCluster extends Construct {

  public readonly eks_cluster: eks.Cluster;

  constructor (scope: Construct, id: string, props: EksClusterProps) {
    super (scope, id);

    const clusterRole = new iam.Role(this, 'eks-cluster-role', {
      assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
      managedPolicies: props.managedPolicies
    });

    this.eks_cluster = new eks.Cluster(this, 'eks-cluster', {
      clusterName: props.clusterName,
      vpc: props.vpc,
      version: props.version,
      vpcSubnets: [
        { subnetType: props.subnetType }
      ],
      role: clusterRole,
      defaultCapacity: 0
    });

  }
}