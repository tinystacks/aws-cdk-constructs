import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import { VPC } from '../../../../src/constructs/networking/vpc';
import { constructId, truncateWithSemiHash } from '@tinystacks/iac-utils';
import { EcsService } from '../../../../src/constructs/compute/ecs-service';
import { EcsCluster } from '../../../../src/constructs/compute/ecs-cluster';
import { SecurityGroups } from '../../../../src/constructs/networking/securitygroups';
import { Redis } from '../../../../src/constructs/db/redis';
import { Alb } from '../../../../src/constructs/proxies/alb';
import { Rds } from '../../../../src/constructs/db/rds';
import { Duration } from 'aws-cdk-lib';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';


export interface StitcherCdkSourceStackProps {
  cidrBlock: string;
  instanceIdentifier: string,
}

export interface FortyNorthSecretArns {
  [key: string]: string;
}



export class StitcherCdkSourceStack extends cdk.Stack {
  constructor (scope: cdk.App, id: string, props: StitcherCdkSourceStackProps, stackProps?: cdk.StackProps) {
    super(scope, id, stackProps);

    const { 
      cidrBlock, 
      instanceIdentifier
    } = props;

    const instanceType = ec2.InstanceType.of(
      ec2.InstanceClass.BURSTABLE3,
      ec2.InstanceSize.MICRO
    );

    const subnetType = ec2.SubnetType.PRIVATE_WITH_NAT;

    //create vpc
    const vpcConstruct = new VPC(this, constructId('stitcher-stack-vpc'), { 
      cidrBlock, 
      internetAccess: true
    });

    const sgRules = [
      {name: 'auroraMySqlAndRedisSecGroup', port:  ec2.Port.tcp(3306), peer: ec2.Peer.anyIpv4()}
    ]

    const securityGroupStack = new SecurityGroups(this, 'auroraMySqlAndRedisSecGroup', {
      vpc: vpcConstruct.vpc,
      securityGroupName: 'aurora-mysql-sl-sg',
      securityGroupRulesList: sgRules
    });

    const subnets =  [
      vpcConstruct.vpc.isolatedSubnets[0],
      vpcConstruct.vpc.isolatedSubnets[1]
    ];

    //rds serverless cluster 

    const rdsConstruct = new Rds(this, constructId('AJRdsStack'), {
      instanceIdentifier: instanceIdentifier,
      vpc: vpcConstruct.vpc,
      databaseEngine: rds.DatabaseInstanceEngine.MYSQL,
      securityGroupsList: [securityGroupStack.securityGroup],
      instanceType: instanceType,
      databaseName: 'mysqldb',
      subnetType: subnetType,
      backupRetention: Duration.days(10)
    });

 
    //Redis
    const redisConstruct = new Redis(this, constructId('stitcher-stack-redis-cluster'), { 
      vpc: vpcConstruct.vpc,
      secGroups: [securityGroupStack.securityGroup.securityGroupId], 
      subnets: subnets, 
      dbIdentifier: 'stitcher-stack-redis-cluster'
    });

    //create ecs cluster 
    const ecsCluster = new EcsCluster(this, constructId('stitcher-stack-ecs-cluster'), { 
      clusterName: 'stitcher-stack-ecs-cluster', 
      vpc: vpcConstruct.vpc
    });

    //create security groups
    const sgRule = [
      { name: 'SSH', port: ec2.Port.tcp(3306), peer: ec2.Peer.anyIpv4() },
    ]; 

    const securityGroups = new SecurityGroups(this, 'stitcher-stack-security-group', {
      vpc: vpcConstruct.vpc,
      securityGroupName: 'common',
      securityGroupRulesList: sgRule
    });


    const policyStatement =  new cdk.aws_iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [rdsConstruct.dbSecret?.secretArn || '']
    });

    //ALB, no API Gateway
    const albConstruct =  new Alb(this, constructId('stitcher-stack-load-balancer'), {
      vpc: vpcConstruct.vpc,
      applicationPort: 80,
      healthCheckPath: '/healthy'
    });


    const secretArns: FortyNorthSecretArns = {
      DJANGO_SETTINGS_MODULE: '',
      MFA_KEY: '',
      SECRET_KEY: '',
      ALLOWED_DOMAIN: '',
      ALLOWED_PORT: '',
      API_PATH: '',
      DB_USER: '',
      DB_PASSWORD: '',
      LICENSE_EXPIRATION: ''
    };


    //ECS service that points 
    // to a docker image (image URI tbd, for now just use express).
    // injected env variables

    const environmentVariables : { [key: string]: string; } = { 
      'AURORA_MYSQL_SECRET': rdsConstruct.dbSecret?.secretArn || '', 
      'DB_HOST': '', //where to get this from?
      'DB_PORT': '3306', 
      'DB_NAME': 'mysqldb', 
      'REDIS_HOST': redisConstruct.redisEndpoint, 
      'REDIS_PORT': '6379', 
      'REDIS_PASSWORD': redisConstruct.redisAuthTokenSecretArn, 
      //'LAMBDA_API_KEY': lamba.secretArn, 
      //'LAMBDA_API_KEY_ID': key.attrApiKeyId
    };

  
    new EcsService(this, constructId('stitcher-stack-ecs-service'), { 
      vpc: vpcConstruct.vpc,
      ecsCluster: ecsCluster.ecsCluster, 
      desiredCount: 1, 
      cpu: 256, 
      memoryLimitMiB: 512, 
      applicationPort: 3000, 
      ecsTaskEnvVars: environmentVariables, 
      ecsSecurityGroup: securityGroups.securityGroup, 
      containerName: 'stitcher-stack-ecs-container',
      containerImage: 'public.ecr.aws/tinystacks/aws-docker-templates-express:latest-x86', 
      albTargetGroup: albConstruct.albTargetGroup, 
      ecsIamPolicyStatements: [policyStatement], 
      //secrets: 
    });
    
  }
}