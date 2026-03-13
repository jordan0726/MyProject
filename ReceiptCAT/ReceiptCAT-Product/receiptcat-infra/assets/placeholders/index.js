exports.handler = async function(event) {
  console.log("Placeholder Lambda invoked", JSON.stringify(event, null, 2));
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from placeholder!" })
  };
};