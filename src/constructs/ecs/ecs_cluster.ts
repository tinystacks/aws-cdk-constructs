import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export interface EcsClusterProps {
  clusterName: string;
  vpc: ec2.Vpc;
  instanceType: ec2.InstanceType;
  machineImage: ec2.IMachineImage;
  desiredCapacity: number;
}

export class EcsCluster extends Construct {

  public readonly ecsCluster: ecs.Cluster;

  constructor (scope: Construct, id: string, props: EcsClusterProps) {
    super (scope, id);

    this.ecsCluster = new ecs.Cluster(this, 'ecs-cluster', {
      clusterName: props.clusterName,
      vpc: props.vpc
    });

    this.ecsCluster.addCapacity('ecs-cluster-add-capacity', {
      instanceType: props.instanceType,
      machineImage: props.machineImage,
      desiredCapacity: props.desiredCapacity
    });
  
  }
}