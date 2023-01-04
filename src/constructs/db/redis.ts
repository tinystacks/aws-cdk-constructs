import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface RedisCacheProps {
  vpc: ec2.IVpc;
  subnets: ec2.ISubnet[];
  securityGroupsList: ec2.ISecurityGroup[];
  instanceType?: string;
  dbIdentifier: string;
  primaryVpcCidrBlock?: string;
}

export class Redis extends Construct {
  private readonly vpc: ec2.IVpc;
  private readonly id;
  private readonly securityGroupsList: ec2.ISecurityGroup[];
  private readonly subnets: ec2.ISubnet[];
  private readonly dbIdentifier: string;
  private readonly instanceType: string | undefined;
  private replicationGroup: elasticache.CfnReplicationGroup;
  private elasticacheSecret: secretsmanager.Secret;

  public constructor (scope: Construct, id: string, props: RedisCacheProps) {
    super(scope, id);
    const {
      vpc,
      subnets,
      securityGroupsList,
      instanceType,
      dbIdentifier
    } = props;
    this.vpc = vpc;
    this.id = id;
    this.securityGroupsList = securityGroupsList;
    this.dbIdentifier = dbIdentifier;
    this.instanceType = instanceType;
    this.subnets = subnets;
    this.initRedisCache();
  }

  public initRedisCache (): void {
    const cfnSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      'redis-subnet-group',
      {
        subnetIds: this.subnets.map(sub => sub.subnetId),
        description: 'isolated subnet group'
      }
    );

    this.elasticacheSecret = new secretsmanager.Secret(this, 'elasticache-secret', {
      generateSecretString: {
        includeSpace: false,
        excludeCharacters: '"%\'()*+,./:;=?@[\\]_`{|}~#!$&'
      }
    });

    this.replicationGroup = new elasticache.CfnReplicationGroup(
      this,
      'redis-cluster',
      {
        replicationGroupId: this.dbIdentifier,
        replicationGroupDescription: 'redis cluster',
        atRestEncryptionEnabled: true,
        cacheNodeType: this.instanceType ?? 'cache.t4g.micro',
        engine: 'redis',
        transitEncryptionEnabled: true,
        // this is an unsafe unwrap of the secret value which may be exposed
        authToken: this.elasticacheSecret.secretValue.unsafeUnwrap(),
        multiAzEnabled: true,
        numNodeGroups: 1,
        replicasPerNodeGroup: 1,
        port: 6379,
        autoMinorVersionUpgrade: true,
        cacheSubnetGroupName: cfnSubnetGroup.ref,
        securityGroupIds: this.securityGroupsList.map(sg => sg.securityGroupId)
      }
    );
  }

  public get redisEndpoint (): string {
    return this.replicationGroup.attrPrimaryEndPointAddress;
  }

  public get redisPort (): string {
    return this.replicationGroup.attrPrimaryEndPointPort;
  }

  public get redisAuthTokenSecretArn (): string {
    return this.elasticacheSecret.secretArn;
  }
}