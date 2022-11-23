import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface RedisCacheProps {
  vpc: ec2.IVpc;
  subnets: ec2.ISubnet[];
  secGroups: string[];
  instanceType?: string;
  dbIdentifier: string;
  primaryVpcCidrBlock?: string;
}

export class Redis extends Construct {
  private readonly vpc: ec2.IVpc;
  private readonly id;
  private readonly secGroups: string[];
  private readonly primaryVpcCidrBlock: string | undefined;
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
      secGroups,
      instanceType,
      dbIdentifier,
      primaryVpcCidrBlock
    } = props;
    this.vpc = vpc;
    this.id = id;
    this.secGroups = secGroups;
    this.primaryVpcCidrBlock = primaryVpcCidrBlock;
    this.dbIdentifier = dbIdentifier;
    this.instanceType = instanceType;
    this.subnets = subnets;
    this.initRedisCache();
  }

  public initRedisCache (): void {
    const redisSecGroup = new ec2.SecurityGroup(
      this, this.id + 'redis-sg', {
        vpc: this.vpc
      });

    this.secGroups.forEach((sg: string, index: number) => {
      redisSecGroup.addIngressRule(ec2.SecurityGroup.fromSecurityGroupId(this, `redis-cache-sg-${index}`, sg), ec2.Port.tcp(6379));
    });
    if (this.primaryVpcCidrBlock !== undefined) {
      redisSecGroup.addIngressRule(ec2.Peer.ipv4(this.primaryVpcCidrBlock), ec2.Port.tcp(6379));
    }

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
        excludeCharacters: '/"@%*()[]{}~|+?,\'\\_=`;:'
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
        securityGroupIds: [redisSecGroup.securityGroupId]
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