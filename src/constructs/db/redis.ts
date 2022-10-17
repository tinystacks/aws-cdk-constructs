import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';


export interface RedisCacheProps {
    vpc: ec2.IVpc;
    subnets: ec2.ISubnet[];
    secGroups: string[];
    instanceType: string;
    dbIdentifier: string;
    primaryVpcCidrBlock?: string;
}

export class Redis extends Construct {
    private vpc: ec2.IVpc;
    private id;
    private secGroups: string[];
    private primaryVpcCidrBlock: string | undefined;
    private subnets: ec2.ISubnet[];
    private dbIdentifier: string;
    private instanceType: string;
    private replicationGroup: elasticache.CfnReplicationGroup;
    private elasticacheSecret: secretsmanager.Secret;


    public constructor(scope: Construct, id: string, props: RedisCacheProps) {
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
        const redisCache = this.initRedisCache();
    }

    public initRedisCache() {

        const redisSecGroup = new ec2.SecurityGroup(
            this, this.id + 'redis-sg', {
            vpc: this.vpc
        });

        this.secGroups.forEach((sg: string, index: number) => {
            redisSecGroup.addIngressRule(ec2.SecurityGroup.fromSecurityGroupId(this, `redis-cache-sg-${index}`, sg), ec2.Port.tcp(6379));
        });
        if (this.primaryVpcCidrBlock != undefined) {
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
                cacheNodeType: 'cache.' + this.instanceType || 'cache.t4g.micro',
                engine: 'redis',
                transitEncryptionEnabled: true,
                authToken: this.elasticacheSecret.secretValue.toString(),
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

    public get redisEndpoint() {
        return this.replicationGroup.attrPrimaryEndPointAddress;
    }

    public get redisPort() {
        return this.replicationGroup.attrPrimaryEndPointPort
    }

    public get redisAuthTokenSecretArn() {
        return this.elasticacheSecret.secretArn
    }
}