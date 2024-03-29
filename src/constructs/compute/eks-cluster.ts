import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { SubnetTagging } from '../networking/tagging';
import { constructId } from '@tinystacks/iac-utils';
import { CfnOutput } from 'aws-cdk-lib';
import { InstanceType } from 'aws-cdk-lib/aws-ec2';
import { EksCleanup } from './eks-cleanup';

export interface EksProps {
  vpc: ec2.IVpc;
  internetAccess: boolean;
  defaultCapacity?: number;
  minimumCapacity?: number;
  maximumCapacity?: number;
  instanceType?: InstanceType;
  clusterName?: string;
}

export class EKS extends Construct {
  id: string;
  private readonly _vpc: ec2.IVpc;
  private readonly _internetAccess: boolean;
  private readonly _defaultCapacity: number;
  private readonly _minimumCapacity: number | undefined;
  private readonly _maximumCapacity: number | undefined;
  private readonly _instanceType: InstanceType;
  private readonly _cluster: eks.Cluster;
  private readonly _mastersRole: iam.Role;
  private readonly _serviceAccount: eks.ServiceAccount;
  private readonly _clusterName: string | undefined;
  private readonly _clusterNameSsmParamName: string;

  constructor (scope: Construct, id: string, props: EksProps) {
    super(scope, id);

    const {
      vpc,
      internetAccess,
      defaultCapacity = 0,
      minimumCapacity,
      maximumCapacity,
      instanceType = new ec2.InstanceType('t3.micro'),
      clusterName = `c-${new Date().getTime()}`
    } = props;

    this.id = id;
    this._vpc = vpc;
    this._internetAccess = internetAccess;
    this._defaultCapacity = defaultCapacity;
    this._minimumCapacity = minimumCapacity;
    this._maximumCapacity = maximumCapacity;
    this._instanceType = instanceType;
    this._clusterName = clusterName;
    const {
      cluster,
      mastersRole
    } = this.createCluster();

    this._cluster = cluster;
    this._mastersRole = mastersRole;
    this.configureLoadBalancerController();
    const cleanup = new EksCleanup(this, constructId('EksCleanup'), {
      vpcId: this.vpc.vpcId,
      clusterName
    });
    this.cluster.node.addDependency(cleanup);
    this.tagSubnets();
    this.createOutputs();
    this._clusterNameSsmParamName = `${id}-clusterName`;
    //store clustername in ssm
    new ssm.StringParameter(this, `${id}-clusterName-ssm`, {
      parameterName: this._clusterNameSsmParamName,
      stringValue: this._cluster.clusterName
    });
    
  }

  private createCluster (): {
    cluster: eks.Cluster
    mastersRole: iam.Role
    } {
    let nodeSubnetType;
    if (this.internetAccess) {
      nodeSubnetType = ec2.SubnetType.PRIVATE_WITH_NAT;
    } else {
      nodeSubnetType = ec2.SubnetType.PUBLIC;
    }

    const mastersRole = new iam.Role(this, constructId('masters', 'role'), {
      assumedBy: new iam.AccountPrincipal(cdk.Stack.of(this).account)
    });

    const cluster = new eks.Cluster(this, constructId('eks', 'cluster'), {
      clusterName: this.clusterName,
      version: eks.KubernetesVersion.V1_21,
      vpc: this.vpc,
      defaultCapacity: 0,
      mastersRole
    });
    mastersRole.attachInlinePolicy(new iam.Policy(this, constructId('kubectl', 'policy'), {
      statements: [
        new iam.PolicyStatement({
          actions: ['kubectl:*'],
          resources: [cluster.clusterArn]
        })
      ]
    }));
    cluster.addAutoScalingGroupCapacity(constructId('eks', 'asg', 'capacity'), {
      instanceType: this.instanceType,
      minCapacity: this.minimumCapacity,
      maxCapacity: this.maximumCapacity,
      vpcSubnets: {
        subnetType: nodeSubnetType
      }
    });
    return { cluster, mastersRole };
  }

  private configureLoadBalancerController () {

    new eks.AlbController(this, 'AlbController', {
      cluster: this._cluster,
      version: eks.AlbControllerVersion.V2_4_1
    });

  }

  private createOutputs () {
    new CfnOutput(this, constructId('cluster', 'name'), {
      description: `${this.id}-cluster-name`,
      value: this.cluster.clusterName
    });
    new CfnOutput(this, constructId('cluster', 'arn'), {
      description: `${this.id}-cluster-arn`,
      value: this.cluster.clusterArn
    });
    new CfnOutput(this, constructId('cluster', 'role', 'name'), {
      description: `${this.id}-cluster-role-name`,
      value: this.cluster.role.roleName
    });
    new CfnOutput(this, constructId('cluster', 'role', 'arn'), {
      description: `${this.id}-cluster-role-arn`,
      value: this.cluster.role.roleArn
    });
    new CfnOutput(this, constructId('cluster', 'admin', 'role', 'name'), {
      description: `${this.id}-cluster-admin-role-name`,
      value: this.cluster.adminRole.roleName
    });
    new CfnOutput(this, constructId('cluster', 'admin', 'role', 'arn'), {
      description: `${this.id}-cluster-admin-role-arn`,
      value: this.cluster.adminRole.roleArn
    });
    new CfnOutput(this, constructId('cluster', 'kubectl', 'role', 'name'), {
      description: `${this.id}-cluster-kubectl-role-name`,
      value: this.cluster.kubectlRole?.roleName || ''
    });
    new CfnOutput(this, constructId('cluster', 'kubectl', 'role', 'arn'), {
      description: `${this.id}-cluster-kubectl-role-arn`,
      value: this.cluster.kubectlRole?.roleArn || ''
    });
    new CfnOutput(this, constructId('cluster', 'masters', 'role', 'name'), {
      description: `${this.id}-cluster-masters-role-name`,
      value: this.mastersRole.roleName
    });
    new CfnOutput(this, constructId('cluster', 'masters', 'role', 'arn'), {
      description: `${this.id}-cluster-masters-role-arn`,
      value: this.mastersRole.roleArn
    });
    // new CfnOutput(this, constructId('eks', 'cluster', 'service', 'account', 'role', 'name'), {
    //   description: `${this.id}-eks-cluster-service-account-role-name`,
    //   value: this.serviceAccount.role.roleName
    // });
    // new CfnOutput(this, constructId('eks', 'cluster', 'service', 'account', 'role', 'arn'), {
    //   description: `${this.id}-eks-cluster-service-account-role-arn`,
    //   value: this.serviceAccount.role.roleArn
    // });
  }

  private createTagParams (resources: string[], key: string, value: string) {
    const params = {
      Resources: resources,
      Tags: [
        {
          Key: key,
          Value: value
        }
      ]
    };
    return params;
  }

  private tagSubnets () {
    const publicSubnets = [];
    const privateSubnets = [];
    for (const subnet of this._vpc.publicSubnets) {
      publicSubnets.push(subnet.subnetId);
    }
    for (const subnet of this._vpc.privateSubnets) {
      privateSubnets.push(subnet.subnetId);
    }
    const publicTagRequestParams = this.createTagParams(publicSubnets, 'kubernetes.io/role/elb', '1');
    const privateTagRequestParams = this.createTagParams(publicSubnets, 'kubernetes.io/role/internal-elb', '1');

    new SubnetTagging(this, 'tagPublicSubnets', { ec2ResourceTagsRequest: publicTagRequestParams });
    new SubnetTagging(this, 'tagPrivateSubnets', { ec2ResourceTagsRequest: privateTagRequestParams });
  }

  public get cluster (): eks.Cluster {
    return this._cluster;
  }

  public get mastersRole (): iam.Role {
    return this._mastersRole;
  }

  public get vpc (): ec2.IVpc {
    return this._vpc;
  }

  public get internetAccess (): boolean {
    return this._internetAccess;
  }

  public get defaultCapacity (): number {
    return this._defaultCapacity;
  }

  public get minimumCapacity (): number | undefined {
    return this._minimumCapacity;
  }

  public get maximumCapacity (): number | undefined {
    return this._maximumCapacity;
  }

  public get instanceType (): InstanceType {
    return this._instanceType;
  }

  public get serviceAccount (): eks.ServiceAccount {
    return this._serviceAccount;
  }

  public get clusterName (): string | undefined {
    return this._clusterName;
  }
  public get clusterNameParameterName (): string {
    return this._clusterNameSsmParamName;
  }
}