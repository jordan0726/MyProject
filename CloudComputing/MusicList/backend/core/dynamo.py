import boto3
import json
from botocore.exceptions import ClientError


class DynamoManager:
    def __init__(self, region='us-east-1'):
        self.dynamodb = boto3.resource('dynamodb', region_name=region) #High-level interface to interact with DynamoDB
        self.client = boto3.client('dynamodb', region_name=region) #Create a low-level client so we can interact with DynamoDB in more detailed ways

    def create_table(self, table_name: str, schema: dict) -> bool:
        """
        Create a DynamoDB table based on provided schema.
        :param table_name:
        :return: bool
        """
        # Check if the table already exists
        existing_table = self.client.list_tables()['TableNames']
        if table_name in existing_table:
            return False # Table already exists

        # Create a table
        try:
            table = self.dynamodb.create_table(TableName= table_name, **schema)
            table.wait_until_exists() # Wait until the table exists
            return True
        except Exception as e:
            print(f"❌ Fail to create table: {e}")
            return False

    def insert_data(self, table_name: str, data:dict) -> bool:
        """
        Inserts a record into the specified DynamoDB table.
        This method stores an item in DynamoDB using the `put_item` method.
        The item must contain the primary key attribute defined in the table schema.

        :param table_name: the name of the table
        :param dict data: A dictionary of data to insert
        :return: bool
        """
        # Ensure the table exists
        existing_tables = self.client.list_tables()['TableNames']
        if table_name not in existing_tables:
            raise ValueError(f"❌ Table '{table_name}' does not exist. Please create it first.")

        try:
            table = self.dynamodb.Table(table_name)
            table.put_item(Item=data)
            return True


        except ClientError as e:
            print(f"Failed to insert data: {e}")
            return False

    def load_data_from_json_into_table(self, table_name: str, json_file: str, partition_key: str, sort_key: str = None) -> bool:
        """
        Loads data from a JSON file and inserts it into the DynamoDB table.
        :param str table_name: The name of the DynamoDB table.
        :param str json_file: The path to the JSON file containing records.
        :param str partition_key: The primary key attribute used as the partition key in the table.
        :param str sort_key: (Optional) The attribute used as the sort key, if applicable.
        :return: bool
        """
        try:
            with open(json_file, "r", encoding="utf-8") as file:
                loaded_data = json.load(file) # Load the JSON file

            # Check if the JSON file contains a list of songs
            if 'songs' not in loaded_data or not isinstance(loaded_data['songs'], list):
                raise ValueError("Invalid JSON format: missing or incorrect 'songs' key.")

            songs = loaded_data['songs']
            table = self.dynamodb.Table(table_name)

            with table.batch_writer() as batch:
                for item in songs:
                    # Check if the partition key exists
                    if partition_key not in item:
                        continue  # jump to the item if the partition key is missing

                    # Build the item with required keys and additional attributes
                    item_data = {partition_key: item[partition_key]}

                    # Add the sort key if it exists
                    if sort_key:
                        if sort_key not in item:
                            continue  # jump to the item if the sort key is missing
                        item_data[sort_key] = item[sort_key]

                    # Include additional attributes
                    for key, value in item.items():
                        if key not in (partition_key, sort_key):  # Avoid duplicating primary keys
                            item_data[key] = value

                    # Add the item to the batch
                    batch.put_item(Item=item_data)
            return True

        except Exception as e:
            print(f"❌ Fail to load data from JSON file: {e}")
            return False


# To-do:
# 1. No checking logic for duplicate data in json，後者會覆蓋前者