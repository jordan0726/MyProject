import boto3

class EC2Manager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.resource('ec2', region_name=region)
        self.ec2_client = boto3.client('ec2', region_name=region)

    def create_instance(self, ami_image_ig, instance_type, key_name, security_group_ids, name='MyLinuxServer' ):
        user_data_script =r"""#!/bin/bash
        # 1. Update & install system packages
        sudo apt update -y
        sudo apt install python3-venv python3-pip git nginx -y
        
        # 2. Clone your repo
        cd /home/ubuntu
        git clone https://github.com/jordan0726/MyProject.git
        
        # 3. Setup venv & install
        cd /home/ubuntu/MyProject/CloudComputing/MusicList/backend
        python3 -m venv venv
        /home/ubuntu/MyProject/CloudComputing/MusicList/backend/venv/bin/pip install --upgrade pip
        /home/ubuntu/MyProject/CloudComputing/MusicList/backend/venv/bin/pip install -r requirements.txt
        
        # 4. Launch uvicorn on 0.0.0.0:8000
        nohup /home/ubuntu/MyProject/CloudComputing/MusicList/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > nohup.out 2>&1 &
        
        # 5. Configure Nginx
        sudo rm /etc/nginx/sites-enabled/default
        
        # Create a new Nginx config
        sudo bash -c 'cat > /etc/nginx/sites-available/fastapi <<EOF
        server {
            listen 80;
            server_name _;
        
            location / {
                proxy_pass http://127.0.0.1:8000;
                proxy_http_version 1.1;
                proxy_set_header Upgrade \$http_upgrade;
                proxy_set_header Connection \"upgrade\";
                proxy_set_header Host \$host;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            }
        }
        '
        
        sudo ln -s /etc/nginx/sites-available/fastapi /etc/nginx/sites-enabled/fastapi
        
        # Test & restart Nginx
        sudo nginx -t
        sudo systemctl restart nginx
        """

        instances = self.ec2.create_instances(
            ImageId = ami_image_ig,
            MinCount =1,
            MaxCount =1,
            InstanceType = instance_type,
            KeyName = key_name,
            SecurityGroupIds = security_group_ids,
            TagSpecifications=[
                {
                    'ResourceType': 'instance',
                    'Tags': [{'Key': 'Name', 'Value': name}]
                }
            ],
            UserData=user_data_script
        )
        instance = instances[0] # create_instance returns a list of instances, but we only created one, so we take the first element
        instance.wait_until_running() # Wait until the instance is running
        instance.load() # Reload the instance attributes

        return instance.id, instance.public_dns_name

    def create_security_group(self):
        try:
            # Create security group
            response = self.ec2_client.create_security_group(
                GroupName='MyLinuxSecurityGroup',
                Description='Security group for FastAPI deployment',
                VpcId= self.get_default_vpc_id()
            )
            security_group_id = response['GroupId']
            print(f"✅ Created Security Group: {security_group_id}")

            # Define rules
            self.ec2_client.authorize_security_group_ingress(
                GroupId=security_group_id,
                IpPermissions=[
                    # SSH (port 22)
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 22,
                        'ToPort': 22,
                        'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                    },
                    # FastAPI (port 8000)
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 8000,
                        'ToPort': 8000,
                        'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                    },
                    # HTTP (port 80)
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 80,
                        'ToPort': 80,
                        'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                    },
                    # HTTPS (port 443)
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 443,
                        'ToPort': 443,
                        'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                    },
                    # ICMP (ping)
                    {
                        'IpProtocol': 'icmp',
                        'FromPort': -1,
                        'ToPort': -1,
                        'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                    }
                ]
            )
            print("✅ Ingress rules added.")
            return security_group_id

        except Exception as e:
            print(f"❌ Error creating security group: {e}")

    def get_default_vpc_id(self):
        """
        Retrieve the default VPC ID in your region
        """
        response = self.ec2_client.describe_vpcs(Filters=[{'Name': 'isDefault', 'Values': ['true']}])
        return response['Vpcs'][0]['VpcId']



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


