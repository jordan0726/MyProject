import boto3
import json

class DynamoDBManager:
    def __init__(self, region='us-east-1'):
        self.dynamodb = boto3.resource('dynamodb', region_name=region) #High-level interface to interact with DynamoDB
        self.client = boto3.client('dynamodb', region_name=region) #Create a low-level client so we can interact with DynamoDB in more detailed ways
        self.table_name = []



    def create_table(self, table_name: str, schema: dict) -> None:
        """
        Create a table in DynamoDB, and store the table name in the table_name list
        :param table_name:
        :return:
        """
        # Check if the table already exists
        existing_table = self.client.list_tables()['TableNames']
        if table_name in existing_table:
            print(f"⚠️ Table '{table_name}' already exists.")
            return

        # Create a table
        table = self.dynamodb.create_table(TableName= table_name, **schema)
        table.wait_until_exists() # Wait until the table exists
        self.table_name.append(table_name) # Store the table name in the table_name list
        print(f"✅ Table '{table_name}' created successfully!")

    def insert_data(self, table_name: str, data:dict) -> None:
        """
        Inserts a record into the specified DynamoDB table.
        This method stores an item in DynamoDB using the `put_item` method.
        The item must contain the primary key attribute defined in the table schema.

        :param table_name: the name of the table
        :param dict data: A dictionary of data to insert
        :return: None
        """
        # Ensure the table exists
        existing_tables = self.client.list_tables()['TableNames']
        if table_name not in existing_tables:
            raise ValueError(f"❌ Table '{table_name}' does not exist. Please create it first.")

        try:
            table = self.dynamodb.Table(table_name)
            table.put_item(Item=data)
            print(f"✅ Data inserted successfully into '{table_name}'!")

        except self.client.exceptions.ResourceNotFoundException:
            print(f"❌ Table '{table_name}' does not exist. Please create it first.")
        except Exception as e:
            print(f"❌ Fail to insert data: {e}")

    def load_data_from_json_into_table(self, table_name: str, json_file: str, partition_key: str, sort_key: str = None) -> None:
        """
        Loads data from a JSON file and inserts it into the DynamoDB table.
        :param str table_name: The name of the DynamoDB table.
        :param str json_file: The path to the JSON file containing records.
        :param str partition_key: The primary key attribute used as the partition key in the table.
        :param str sort_key: (Optional) The attribute used as the sort key, if applicable.
        :return: None
        """
        try:
            with open(json_file, "r", encoding="utf-8") as file:
                loaded_data = json.load(file) # Load the JSON file

            # Check if the JSON file contains a list of songs
            if 'songs' not in loaded_data or not isinstance(loaded_data['songs'], list):
                raise ValueError(f"❌ Invalid JSON format: Missing 'songs' key or it's not a list.")

            songs = loaded_data['songs']
            print(f"🔄 Inserting {len(songs)} records into '{table_name}'...")

            table = self.dynamodb.Table(table_name)
            with table.batch_writer() as batch:
                for item in songs:
                    # Check if the partition key exists
                    if partition_key not in item:
                        print(f"⚠️ Skipping item: Missing '{partition_key}' field.")
                        continue  # jump to the item if the partition key is missing

                    # Build the item with required keys and additional attributes
                    item_data = {partition_key: item[partition_key]}
                    # Add the sort key if it exists
                    if sort_key:
                        if sort_key not in item:
                            print(f"⚠️ Skipping item: Missing '{sort_key}' field.")
                            continue  # jump to the item if the sort key is missing
                        item_data[sort_key] = item[sort_key]

                    # Include additional attributes
                    for key, value in item.items():
                        if key not in (partition_key, sort_key):  # Avoid duplicating primary keys
                            item_data[key] = value

                    # Add the item to the batch
                    batch.put_item(Item=item_data)

            print(f"✅ Successfully inserted all records into '{table_name}'.")
        except Exception as e:
            print(f"❌ Fail to load data from JSON file: {e}")






    def delete_all_items(self, table_name: str) -> None:
        """
        Deletes all items from the specified DynamoDB table.
        :param table_name
        :return: None
        """
        table = self.dynamodb.Table(table_name)
        try:
            #Scan to get all items
            items = table.scan().get('Items', [])

            for item in items:
                primary_key = {"email": item["email"]} # Get the primary key of the item
                table.delete_item(Key=primary_key)
                print(f"🗑️ Deleted: {primary_key}")

            print(f"✅ All items deleted from '{table_name}'.")
        except Exception as e:
            print(f"❌ Fail to delete all items: {e}")

