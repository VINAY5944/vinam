
"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("submissions", {
            id: {
                type: Sequelize.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },

            form_id: {
                type: Sequelize.STRING(150),
                allowNull: false
            },

            idempotency_key: {
                type: Sequelize.STRING(255),
                allowNull: false
            },

            email: {
                type: Sequelize.STRING(255),
                allowNull: false
            },

            data: {
                type: Sequelize.JSONB,
                allowNull: false
            },

            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
            },

            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
            }
        });

        await queryInterface.addIndex(
            "submissions",
            ["idempotency_key"],
            {
                unique: true,
                name: "submissions_idempotency_key_unique"
            }
        );

        await queryInterface.addIndex(
            "submissions",
            ["form_id", "createdAt"],
            {
                name: "submissions_form_created_at_idx"
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.dropTable("submissions");
    }
};
