import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { constructId } from '@tinystacks/iac-utils';
import { Secret } from 'aws-cdk-lib/aws-ecs';
import isEmpty from 'lodash.isempty';

export interface EcsServiceProps {
  containerName: string;
  vpc: ec2.IVpc;
  ecsCluster: ecs.Cluster;
  containerImage?: string;
  repositoryImage?: ecs.ContainerImage;
  memoryLimitMiB: number;
  cpu: number;
  /**
   * Sets the memoryLimitMiB on the initial container.
   * Only use this property if you are sure that you need to reserve a specific amount of memory for the container.
   * Otherwise it is best to let it dynamically claim whatever it needs from the Task's allocated memory.
   */
  containerMemoryLimitMiB?: number;
  desiredCount: number;
  applicationPort: number;
  ecsSecurityGroup: ec2.SecurityGroup;
  ecsIamPolicyStatements: iam.PolicyStatement[];
  albTargetGroup?: elbv2.ApplicationTargetGroup;
  ecsTaskEnvVars: { [key: string]: string; };
  secrets?: { [key: string]: Secret; }
  command?: string[];
  assignPublicIp?: boolean;
}

export class EcsService extends Construct {
  private ecsService: ecs.FargateService;
  constructor (scope: Construct, id: string, props: EcsServiceProps) {
    super (scope, id);

    const ecsTaskRole = new iam.Role(this, constructId('ecs', 'TaskRole'), {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role that the api task definitions use'
    });

    if (!isEmpty(props.ecsIamPolicyStatements)) {
      ecsTaskRole.attachInlinePolicy(
        new iam.Policy(this, constructId('ecs', 'TaskPolicy'), {
          statements: props.ecsIamPolicyStatements
        })
      );
    }
    

    const ecsTaskDefinition = new ecs.FargateTaskDefinition(this, constructId('ecs', 'TaskDefinition'), {
      cpu: props.cpu,
      memoryLimitMiB: props.memoryLimitMiB,      
      taskRole: ecsTaskRole
    });

    const ecsContainer = ecsTaskDefinition.addContainer(constructId('ecs', 'Container'), {
      containerName: props.containerName,
      image: props.repositoryImage || ecs.RepositoryImage.fromRegistry(props.containerImage || ''),
      memoryLimitMiB: props.containerMemoryLimitMiB,
      environment: props.ecsTaskEnvVars,
      logging: ecs.LogDriver.awsLogs({ streamPrefix: props.containerName, logRetention: 90 }),
      secrets: props.secrets,
      command: props.command
    });

    ecsContainer.addPortMappings({ containerPort: props.applicationPort });

    const { assignPublicIp = false } = props;
    this.ecsService = new ecs.FargateService(this, constructId('ecs', 'FargfateService'), {
      cluster: props.ecsCluster,
      desiredCount: props.desiredCount,
      taskDefinition: ecsTaskDefinition,
      securityGroups: [props.ecsSecurityGroup],
      assignPublicIp,
      enableExecuteCommand: true
    });

    if (props.albTargetGroup) {
      this.ecsService.attachToApplicationTargetGroup(props.albTargetGroup);
    }
  }

  public service () {
    return this.ecsService;
  }

}