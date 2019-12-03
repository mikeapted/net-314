import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import { ManagedPolicy, Role, ServicePrincipal } from '@aws-cdk/aws-iam';

export class Net314Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // IAM

    const role = new Role(this, 'InstanceCoreRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com')
    });
    role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    // Elastic IPs

    const elasticIP = new ec2.CfnEIP(this, 'ElasticIP');

    // VPCs

    const leftVpc = new ec2.Vpc(this, 'LeftVPC', {
      cidr: "10.1.0.0/16",
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingressLeftPublic',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ]
    });

    const rightVpc = new ec2.Vpc(this, 'RightVPC', {
      cidr: "10.2.0.0/16",
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingressRightPublic',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ]
    });

    const southVpc = new ec2.Vpc(this, 'SouthVPC', {
      cidr: "10.3.0.0/16",
      maxAzs: 1,
      natGatewayProvider: ec2.NatProvider.instance({
        instanceType: new ec2.InstanceType('t3.micro')
      }),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingressSouthPublic',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'ingressSouthPrivate',
          subnetType: ec2.SubnetType.PRIVATE,
        }
      ]
    });

    // EC2

    const leftSg = new ec2.SecurityGroup(this, 'LeftSecurityGroup', {
      securityGroupName: 'LeftSecurityGroup',
      vpc: leftVpc
    });
    leftSg.addIngressRule(ec2.Peer.ipv4("10.0.0.0/8"), ec2.Port.allTraffic(), 'All');

    const rightSg = new ec2.SecurityGroup(this, 'RightSecurityGroup', {
      securityGroupName: 'RightSecurityGroup',
      vpc: rightVpc
    });
    rightSg.addIngressRule(ec2.Peer.ipv4("10.0.0.0/8"), ec2.Port.allTraffic(), 'All');

    const openSwanSg = new ec2.SecurityGroup(this, 'OpenSwanSecurityGroup', {
      securityGroupName: 'OpenSwanSecurityGroup',
      vpc: southVpc
    });
    openSwanSg.addIngressRule(ec2.Peer.ipv4("10.0.0.0/8"), ec2.Port.allTraffic(), 'All');
    openSwanSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(500), 'All');

    const southSg = new ec2.SecurityGroup(this, 'SouthSecurityGroup', {
      securityGroupName: 'SouthSecurityGroup',
      vpc: southVpc
    });
    southSg.addIngressRule(ec2.Peer.ipv4("10.0.0.0/8"), ec2.Port.allTraffic(), 'All');


    const amznLinux = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    });

    const leftEc2 = new ec2.Instance(this, 'LeftEC2', {
      instanceName: 'Left',
      instanceType: new ec2.InstanceType('t3.micro'),
      machineImage: amznLinux,
      role: role,
      securityGroup: leftSg,
      vpc: leftVpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }
    });

    const rightEc2 = new ec2.Instance(this, 'RightEC2', {
      instanceName: 'Right',
      instanceType: new ec2.InstanceType('t3.micro'),
      machineImage: amznLinux,
      role: role,
      securityGroup: rightSg,
      vpc: rightVpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }
    });

    const openSwanEc2 = new ec2.Instance(this, 'OpenSwanEC2', {
      instanceName: 'OpenSwan',
      instanceType: new ec2.InstanceType('t3.micro'),
      machineImage: amznLinux,
      role: role,
      securityGroup: openSwanSg,
      sourceDestCheck: false,
      vpc: southVpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }
    });

    const southEc2 = new ec2.Instance(this, 'SouthEC2', {
      instanceName: 'Private',
      instanceType: new ec2.InstanceType('t3.micro'),
      machineImage: amznLinux,
      securityGroup: southSg,
      role: role,
      vpc: southVpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE }
    });
  }
}
