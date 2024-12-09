const executeQuery = async (pool, query, params = []) => {
  try {
    await pool.query(query, params);
    console.log('Query executed successfully:\n', query);
  } catch (err) {
    console.error('Error executing query:\n', query, '\nError:', err.message);
    throw err;
  }
};

export { executeQuery };
