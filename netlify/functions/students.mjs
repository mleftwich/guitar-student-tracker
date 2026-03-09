import { getStore } from "@netlify/blobs";

const STORE_NAME = "guitar-tracker";
const BLOB_KEY   = "students";

export default async (req) => {
  const store = getStore(STORE_NAME);

  // GET — load all students
  if (req.method === "GET") {
    try {
      const data = await store.get(BLOB_KEY, { type: "json" });
      return Response.json(data || []);
    } catch (err) {
      return Response.json([]);
    }
  }

  // POST — save all students
  if (req.method === "POST") {
    try {
      const students = await req.json();
      await store.setJSON(BLOB_KEY, students);
      return new Response("OK", { status: 200 });
    } catch (err) {
      return new Response("Failed to save: " + err.message, { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};
