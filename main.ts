import { App } from 'cdktf';
import { BaseStackProps } from './lib/stacks/stackbase';
import { taskDefinitionStack } from './lib/stacks/taskdefinitions-stack';
import { dbStack, DbConfigs } from './lib/stacks/db-stack';
import { LoadBalancerStack, LbConfigs } from './lib/stacks/loadbalancer-stack';
import { EcsClusterStack } from './lib/stacks/ecs-cluster-stack';
import { EcsServiceStack, EcsServiceConfigs } from './lib/stacks/ecs-service-stack';
import { AppAutoScalingStack, AppAutoScalingConfigs } from './lib/stacks/application-as-stack';
import { sgStack } from './lib/stacks/securitygroup-stack';
import { Route53Stack, RouteConfigs } from './lib/stacks/route53-stack';
//import { RemoteBackend } from 'cdktf'; // uncomment this line to use Terraform Cloud

const StackProps: BaseStackProps = {
    name: "second-complete",
    project: "deployment-test",
    region: "us-east-2"
}

const app = new App();
const cluster = new EcsClusterStack(app, "ecs-cluster-stack", StackProps);
const sGroup = new sgStack(app, "sg-stack", StackProps);
const db = new dbStack(app, "db-stack", StackProps);

const DbConfig: DbConfigs = {
    name: StackProps.name,
    project: StackProps.project,
    region: StackProps.region,
    dbAddress: db.db.address,
    dbName: db.db.dbName,
}

const LbConfig: LbConfigs = {
    name: StackProps.name,
    project: StackProps.project,
    region: StackProps.region,
    securityGroup: sGroup.sg.id,
    certificate: `${process.env.CERTIFICATE}`,
}


const taskDefinition = new taskDefinitionStack(app, "td-stack", DbConfig);
const lb = new LoadBalancerStack(app, "lb-stack", LbConfig);

const EcsConfig: EcsServiceConfigs = {
    name: StackProps.name,
    project: StackProps.project,
    region: StackProps.region,
    cluster: cluster.cluster.arn,
    taskDefinition: taskDefinition.td.arn,
    targetGroup: lb.targetGroup.arn,
    securityGroup: sGroup.sg.id,
    desiredCount: 1,
}

const ecs = new EcsServiceStack(app, "ecs-service-stack", EcsConfig);

const AppAsConfig : AppAutoScalingConfigs = {
    name: StackProps.name,
    project: StackProps.project,
    region: StackProps.region,
    minCapacity: 1,
    maxCapacity: 4,
    cpuTargetValue: 70,
    memoryTargetValue: 70,
    ecsClusterName: cluster.cluster.name,
    ecsServiceName: ecs.ecs.name
}

new AppAutoScalingStack(app, "ecs-autoscaling-stack", AppAsConfig)

 const routeConfig : RouteConfigs = {
    name: StackProps.name,
    project: StackProps.project,
    region: StackProps.region,
    zoneId: `${process.env.ZONEID}`,
    dnsName: lb.lb.dnsName,
    lbZoneId: lb.lb.zoneId,
}

new Route53Stack(app, "route53-stack", routeConfig)

// To deploy using Terraform Cloud comment out the above line
// And uncomment the below block of lines

/*const stack = new EcsServiceStack(app, "ecs-service-stack", EcsConfig);
new RemoteBackend(stack, {
  hostname: "app.terraform.io",
  organization: process.env.CDKTF_ECS_TFC_ORGANIZATION || "",
  workspaces: {
    name: "ecs-microservices-cdktf"
  }
}); */

app.synth();
