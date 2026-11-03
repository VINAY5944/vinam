"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("submission_hourly_counts", {
      form_id: { type: Sequelize.STRING(150), allowNull: false, primaryKey: true },
      hour_start: { type: Sequelize.DATE, allowNull: false, primaryKey: true },
      submission_count: { type: Sequelize.BIGINT, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable("submission_hourly_counts"); }
};
