import boto3

class EC2Manager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.resource('ec2', region_name=region)

    def create_instance(self, ami_image_ig, instance_type, key_name, security_group_ids):
        instances = self.ec2.create_instances(
            ImageId = ami_image_ig,
            MinCount =1,
            MaxCount =1,
            InstanceType = instance_type,
            KeyName = key_name,
            SecurityGroupIds = security_group_ids
        )
        instance = instances[0] # create_instance returns a list of instances, but we only created one, so we take the first element
        instance.wait_until_running() # Wait until the instance is running
        instance.load() # Reload the instance attributes

        return instance.id, instance.public_dns_name

    def stop_instance(self, instance_id):
        instance = self.ec2.Instance(instance_id)
        instance.stop()

    def start_instance(self, instance_id):
        instance = self.ec2.Instance(instance_id)
        instance.start()

    def terminate_instance(self, instance_id):
        instance = self.ec2.Instance(instance_id)
        instance.terminate()

    def get_instance_status(self, instance_id):
        instance = self.ec2.Instance(instance_id)
        return instance.state['Name']
