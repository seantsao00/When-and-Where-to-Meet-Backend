const executeQuery = async (pool, query) => {
  try {
    await pool.query(query);
    console.log('Query executed successfully:\n', query);
  } catch (err) {
    console.error('Error executing query:\n', query, '\nError:', err.message);
    throw err;
  }
};

export { executeQuery };
