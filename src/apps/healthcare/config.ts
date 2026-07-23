import dotenv from 'dotenv';
dotenv.config();

const ENV = {
    UAT: {
        baseUrl: 'https://katalon-demo-cura.herokuapp.com/',
    },
    LIVE: {
        baseUrl: 'https://live.example.com',
    },
};

export const currentEnv = ENV[(process.env.ENV as keyof typeof ENV) || 'UAT'];

export const credentials = {
    admin: {
        username: process.env.HEALTHCARE_ADMIN_USERNAME || '',
        password: process.env.HEALTHCARE_ADMIN_PASSWORD || '',
    },
    customer: {
        username: process.env.HEALTHCARE_CUST_USERNAME || '',
        password: process.env.HEALTHCARE_CUST_PASSWORD || '',
    },
};
