import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Submission = sequelize.define(
    "Submission",
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        form_id: {
            type: DataTypes.STRING(150),
            allowNull: false
        },
        idempotency_key: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        data: {
            type: DataTypes.JSONB,
            allowNull: false
        }
    },
    {
        tableName: "submissions",
        timestamps: true
    }
);

export default Submission;