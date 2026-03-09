const { getStore } = require("@netlify/blobs");

const STORE_NAME = "guitar-tracker";
const BLOB_KEY   = "students";

exports.handler = async (event) => {
  const store = getStore(STORE_NAME);

  // GET — load all students
  if (event.httpMethod === "GET") {
    try {
      const data = await store.get(BLOB_KEY, { type: "json" });
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data || []),
      };
    } catch (err) {
      // Key doesn't exist yet — return empty array
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([]),
      };
    }
  }

  // POST — save all students
  if (event.httpMethod === "POST") {
    try {
      const students = JSON.parse(event.body);
      await store.setJSON(BLOB_KEY, students);
      return { statusCode: 200, body: "OK" };
    } catch (err) {
      return { statusCode: 500, body: "Failed to save: " + err.message };
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
