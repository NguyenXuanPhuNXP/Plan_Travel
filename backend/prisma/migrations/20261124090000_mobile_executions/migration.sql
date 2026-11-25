CREATE TABLE trip_executions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  itinerary_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  active_user_id BIGINT UNSIGNED NULL,
  snapshot JSON NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  version INT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  finished_at DATETIME(3) NULL,
  location_sharing BOOLEAN NOT NULL DEFAULT FALSE,
  sharing_version INT UNSIGNED NOT NULL DEFAULT 0,
  latitude DOUBLE NULL,
  longitude DOUBLE NULL,
  accuracy_meters DOUBLE NULL,
  captured_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_execution_member (itinerary_id, user_id),
  UNIQUE KEY uq_active_execution_user (active_user_id),
  KEY idx_execution_user (user_id),
  CONSTRAINT fk_execution_itinerary FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  CONSTRAINT fk_execution_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE trip_execution_stops (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  execution_id BIGINT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL,
  snapshot JSON NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  arrived_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  skipped_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_execution_stop_order (execution_id, sort_order),
  CONSTRAINT fk_stop_execution FOREIGN KEY (execution_id) REFERENCES trip_executions(id) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
