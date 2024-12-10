import pkg from 'pg';
import { dropDatabase, queryWithAnalysis, restoreDB } from './utils.js';

const { Client } = pkg;
const testDBName = 'testindex';
const query = `
  WITH meeting_duration AS ( -- 計算會議的開始時間和結束時間
      SELECT
          m.id AS meet_id,
          m.start_time AS start_time,
          (m.start_time + m.duration) AS end_time,
          m.duration,
          m.start_date AS start_date -- 添加 start_date 以便生成完整的 timestamp
      FROM meet AS m
  ),
  available_combinations AS ( -- 找到每個會議地點和時間段可用的組合
      SELECT
          a.meet_id,
          a.time_segment,
          l.id AS location_id,
          l.name AS location_name,
          COUNT(*) AS available_users
      FROM availability AS a
      JOIN availability_location AS al ON al.availability_id = a.id
      JOIN location_option AS lo ON lo.id = al.location_option_id
      JOIN location AS l ON l.id = lo.location_id
      GROUP BY a.meet_id, a.time_segment, l.id
  ),
  valid_combinations AS ( -- 過濾掉與其他會議時間衝突的地點和時間段
      SELECT
          ac.meet_id,
          ac.time_segment,
          ac.location_id,
          ac.location_name,
          ac.available_users
      FROM available_combinations AS ac
      JOIN meeting_duration AS md ON ac.meet_id = md.meet_id
      WHERE NOT EXISTS (
          SELECT 1
          FROM final_decision AS fd
          JOIN meeting_duration AS md_other ON fd.meet_id = md_other.meet_id
          WHERE fd.final_place_id = ac.location_id
            AND ac.time_segment BETWEEN
                (md_other.start_date + md_other.start_time) AND -- 將 start_time 加到 start_date
                (md_other.start_date + md_other.end_time)       -- 將 end_time 加到 start_date
      )
  ),
  ranked_combinations AS ( -- 根據每個地點和時間段的可用人數排序，並為每個會議排名
      SELECT
          vc.meet_id,
          vc.time_segment,
          vc.location_id,
          vc.location_name,
          vc.available_users,
          ROW_NUMBER() OVER (PARTITION BY vc.meet_id ORDER BY vc.available_users DESC) AS rank
      FROM valid_combinations AS vc
  )
  -- 返回用戶指定的前 N 個最佳選擇
  SELECT
      rc.meet_id,
      rc.time_segment,
      rc.location_id,
      rc.location_name,
      rc.available_users
  FROM ranked_combinations AS rc
  WHERE rc.meet_id = 6 AND rc.rank <= 7;
`;

const test_index = async () => {
  const client = new Client({ database: testDBName });
  const createIndex = ` 
    CREATE INDEX idx_availability_meet_time_segment
    ON availability (meet_id, time_segment);

    CREATE INDEX idx_availability_location
    ON availability_location (availability_id, location_option_id);

    CREATE INDEX idx_location_option_meet_location
    ON location_option (meet_id, location_id);

    CREATE INDEX idx_final_decision_place_time
    ON final_decision (final_place_id, final_time);

    CREATE INDEX idx_meet_start_date_time_duration
    ON meet (id, start_date, start_time, duration);
  `;
  try {
    await restoreDB(testDBName);

    await client.connect();
    await queryWithAnalysis(query);
    await client.query(createIndex);
    await queryWithAnalysis(query);
    await client.end();

    await dropDatabase(testDBName);
  } catch (err) {
    console.error('Error building index:', err.message);
  }
};

test_index();
