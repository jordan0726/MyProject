from dynamo_manager import DynamoDBManager  # Import only the class
from s3_manager import S3Manager

def main():
    db = DynamoDBManager()
    json_file = '2025a1.json'
    login_table_schema = {
        "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "email", "AttributeType": "S"}],
        "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }

    music_table_schema = {
        "KeySchema": [{"AttributeName": "title", "KeyType": "HASH"}, # Partition key
                      {"AttributeName": "album", "KeyType": "RANGE"} # Sort key
                      ],
        "AttributeDefinitions":[
            {"AttributeName": "title", "AttributeType": "S"},
            # {"AttributeName": "artist", "AttributeType": "S"},
            # {"AttributeName": "year", "AttributeType": "N"},
            {"AttributeName": "album", "AttributeType": "S"},
            # {"AttributeName": "image_url", "AttributeType": "S"}
        ],
        "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }

    # TASK 1.1 -- Create a 'login' table and insert data
    db.create_table('login', login_table_schema)

    # Insert data
    for i in range(10):
        email = f"s4068959{i}@student.rmit.edu.au"
        user_name = f"JordanChiou{i}"
        password = "".join(str((i+j) % 10) for j in range(6))

        # data dict
        user_data = {
            'email': email,
            'user_name': user_name,
            'password': password
        }

        # insert data into the table
        db.insert_data('login', user_data)

    # TASK 1.2 -- create a table titled 'music'
    db.create_table('music', music_table_schema)

    # TASK1.3 -- Load data from json file
    db.load_data_from_json_into_table('music', json_file, 'title', 'album')

    # TASK 2 -- Download from img_url and upload images to S3
    s3_manager = S3Manager()
    bucket_name = 'media-storage-s4068959'
    # Create a bucket
    s3_manager.create_s3_bucket(bucket_name)
    # Download and Upload images to S3
    s3_manager.download_and_upload(json_file, bucket_name)


if __name__ == "__main__":
    main()  # Run the script


# Reference:
# S3 creating and upload file: https://docs.aws.amazon.com/code-library/latest/ug/python_3_s3_code_examples.html
# requests package: https://www.simplilearn.com/tutorials/python-tutorial/python-requests