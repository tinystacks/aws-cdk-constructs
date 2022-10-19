import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as cdk from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { cpus } from 'os';

export interface EcsServiceProps {
  containerName: string;
  vpc: ec2.Vpc;
  ecsCluster: ecs.Cluster;
  containerImage: string;
  memoryLimitMiB: number;
  cpu: number;
  applicationPort: number;

}

export class EcsService extends Construct {

  readonly ecsAlb: elbv2.ApplicationLoadBalancer;

  constructor (scope: Construct, id: string, props: EcsServiceProps) {
    super (scope, id);

    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'ecs-ec2-task-definition');

    const ecsContainer = taskDefinition.addContainer("ecs-container", {
      containerName: props.containerName,
      image: ecs.ContainerImage.fromRegistry(props.containerImage),
      memoryLimitMiB: props.memoryLimitMiB,
      cpu: props.cpu,
    });

    ecsContainer.addPortMappings({
      containerPort: props.applicationPort,
      hostPort: props.applicationPort,
      protocol: ecs.Protocol.TCP
    });

    const ecsService = new ecs.Ec2Service(this, "ecs-ec2-service", {
      cluster: props.ecsCluster,
      taskDefinition: taskDefinition,
    });

    this.ecsAlb = new elbv2.ApplicationLoadBalancer(this, 'ecs-alb', {
      vpc: props.vpc,
      internetFacing: true
    });

    const ecsListener = this.ecsAlb.addListener('EcsListener', {
      port: 80,
      open: true
    });

    ecsListener.addTargets('ECS', {
      port: props.applicationPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [ecsService.loadBalancerTarget({
        containerName: props.containerName,
        containerPort: props.applicationPort
      })],
      healthCheck: {
        interval: cdk.Duration.seconds(60),
        path: "/health",
        timeout: cdk.Duration.seconds(5),
      }
    });

    new cdk.CfnOutput(this, 'ECSLoadBalancerDNS', {
      value: this.ecsAlb.loadBalancerDnsName
    });
  
  }

  public get EcsServiceDnsName (): string {
    return this.ecsAlb.loadBalancerDnsName;
  }

}