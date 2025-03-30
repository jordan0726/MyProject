music_table_schema = {
    "KeySchema": [
        {"AttributeName": "title", "KeyType": "HASH"},  # Partition key
        {"AttributeName": "album", "KeyType": "RANGE"}  # Sort key
    ],
    "AttributeDefinitions": [
        {"AttributeName": "title", "AttributeType": "S"},
        {"AttributeName": "album", "AttributeType": "S"},
    ],
    "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
}