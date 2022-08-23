import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { constructId } from '@tinystacks/utils';
import { CfnOutput } from 'aws-cdk-lib';
import kebabCase from 'lodash.kebabcase';
import { InstanceClass, InstanceSize, InstanceType } from 'aws-cdk-lib/aws-ec2';


export interface EksProps {
    vpc: ec2.IVpc;
    internetAccess: boolean;
    defaultCapacity?: number;
    minimumCapacity?: number;
    maximumCapacity?: number;
    instanceClass?: InstanceClass;
    instanceSize?: InstanceSize;
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

  constructor (scope: Construct, id: string, props: EksProps) {
    super(scope, id);
    
    const {
      vpc,
      internetAccess,
      defaultCapacity = 0,
      minimumCapacity,
      maximumCapacity,
      instanceClass = InstanceClass.BURSTABLE3,
      instanceSize = InstanceSize.MEDIUM,
      clusterName
    } = props;
    
    this.id = id;
    this._vpc = vpc;
    this._internetAccess = internetAccess;
    this._defaultCapacity = defaultCapacity;
    this._minimumCapacity = minimumCapacity;
    this._maximumCapacity = maximumCapacity;
    this._instanceType = InstanceType.of(instanceClass, instanceSize);
    this._clusterName = clusterName;
    const {
      cluster,
      mastersRole
    } = this.createCluster();
    this._cluster = cluster;
    this._mastersRole = mastersRole;
    this._serviceAccount = this.configureLoadBalancerController();
    this.tagSubnets();
    this.createOutputs();
  }

  private createCluster (): {
    cluster: eks.Cluster;
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

  private configureLoadBalancerController (): eks.ServiceAccount {
    const loadBalancerServiceAccountName = 'aws-load-balancer-controller';
    const serviceAccount = this.cluster.addServiceAccount(constructId('lb', 'serviceAccount'), {
      name: loadBalancerServiceAccountName,
      namespace: 'default'
    });
    serviceAccount.addToPrincipalPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: [
          'elasticloadbalancing:CreateListener',
          'elasticloadbalancing:CreateTargetGroup',
          'elasticloadbalancing:DeleteListener',
          'elasticloadbalancing:CreateLoadBalancer',
          'elasticloadbalancing:CreateRule',
          'elasticloadbalancing:DeleteRule',
          'iam:CreateServiceLinkedRole',
          'ec2:AuthorizeSecurityGroupIngress',
          'ec2:RevokeSecurityGroupIngress',
          'ec2:CreateSecurityGroup',
          'cognito-idp:DescribeUserPoolClient',
          'acm:ListCertificates',
          'acm:DescribeCertificate',
          'iam:ListServerCertificates',
          'iam:GetServerCertificate',
          'waf-regional:GetWebACL',
          'waf-regional:GetWebACLForResource',
          'waf-regional:AssociateWebACL',
          'waf-regional:DisassociateWebACL',
          'wafv2:GetWebACL',
          'wafv2:GetWebACLForResource',
          'wafv2:AssociateWebACL',
          'wafv2:DisassociateWebACL',
          'shield:GetSubscriptionState',
          'shield:DescribeProtection',
          'shield:CreateProtection',
          'shield:DeleteProtection',
          'ec2:DescribeAccountAttributes',
          'ec2:DescribeAddresses',
          'ec2:DescribeAvailabilityZones',
          'ec2:DescribeInternetGateways',
          'ec2:DescribeVpcs',
          'ec2:DescribeVpcPeeringConnections',
          'ec2:DescribeSubnets',
          'ec2:DescribeSecurityGroups',
          'ec2:DescribeInstances',
          'ec2:DescribeNetworkInterfaces',
          'ec2:DescribeTags',
          'ec2:CreateTags',
          'ec2:GetCoipPoolUsage',
          'ec2:DescribeCoipPools',
          'elasticloadbalancing:DescribeLoadBalancers',
          'elasticloadbalancing:DescribeLoadBalancerAttributes',
          'elasticloadbalancing:DescribeListeners',
          'elasticloadbalancing:DescribeListenerCertificates',
          'elasticloadbalancing:DescribeSSLPolicies',
          'elasticloadbalancing:DescribeRules',
          'elasticloadbalancing:DescribeTargetGroups',
          'elasticloadbalancing:DescribeTargetGroupAttributes',
          'elasticloadbalancing:DescribeTargetHealth',
          'elasticloadbalancing:DescribeTags',
          'elasticloadbalancing:SetWebAcl',
          'elasticloadbalancing:ModifyListener',
          'elasticloadbalancing:AddListenerCertificates',
          'elasticloadbalancing:RemoveListenerCertificates',
          'elasticloadbalancing:ModifyRule',
          'elasticloadbalancing:DeleteTargetGroup',
          'elasticloadbalancing:DeregisterTargets',
          'elasticloadbalancing:ModifyTargetGroupAttributes',
          'elasticloadbalancing:RegisterTargets'
        ],
        effect: iam.Effect.ALLOW
      })
    );

    this.cluster.addHelmChart(
      constructId('lb', 'helm'),
      {
        chart: 'aws-load-balancer-controller',
        repository: 'https://aws.github.io/eks-charts',
        namespace: 'default',
        release: kebabCase(`${this.id}-lb`), // was throwing if it contained the TitleCase id.
        version: '1.4.3',
        values: {
          deploymentAnnotations: {
            'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing'
          },
          clusterName: this.cluster.clusterName,
          vpcId: this.vpc.vpcId,
          serviceAccount: {
            create: false,
            name: loadBalancerServiceAccountName
          }
        }
      }
    );
    
    return serviceAccount;
  }

  private tagSubnets () {
    for (const subnet of this.vpc.privateSubnets) {
      const importedSubnet = ec2.Subnet.fromSubnetId(this, `${subnet.subnetId}`, subnet.subnetId);
      cdk.Tags.of(importedSubnet).add(
        'kubernetes.io/role/internal-elb',
        '1'
      );
    }
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
    new CfnOutput(this, constructId('eks', 'cluster', 'service', 'account', 'role', 'name'), {
      description: `${this.id}-eks-cluster-service-account-role-name`,
      value: this.serviceAccount.role.roleName
    });
    new CfnOutput(this, constructId('eks', 'cluster', 'service', 'account', 'role', 'arn'), {
      description: `${this.id}-eks-cluster-service-account-role-arn`,
      value: this.serviceAccount.role.roleArn
    });
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
}