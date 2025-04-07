# subscription_table_schema.py
subscription_table_schema = {
    "KeySchema": [
        {"AttributeName": "email", "KeyType": "HASH"},        # user email as partition key
        {"AttributeName": "musicId", "KeyType": "RANGE"}        # musicId as sort key ( can combine title and album, eg. "title|album")
    ],
    "AttributeDefinitions": [
        {"AttributeName": "email", "AttributeType": "S"},
        {"AttributeName": "musicId", "AttributeType": "S"}
    ],
    "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
}
