import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { app, server } from '../src/server';
import request from 'supertest';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

beforeAll(async () => {
    dotenv.config();
    const db_host = process.env.db_host;
    const db_name = process.env.db_name;
    const db_user = process.env.db_user;
    const db_pwd = process.env.db_pwd;
    const db_port = process.env.db_port === undefined ? undefined : parseInt(process.env.db_port);
    const conn = await mysql.createConnection({
        host: db_host,
        database: db_name,
        user: db_user,
        password: db_pwd,
        port: db_port,
    });
    await conn.query(`DROP DATABASE IF EXISTS \`${db_name}\`;`);
    await conn.query(`CREATE DATABASE \`${db_name}\`;`);
    jest.spyOn(console, 'warn').mockImplementation(jest.fn());
    jest.spyOn(console, 'log').mockImplementation(jest.fn());
    jest.spyOn(console, 'debug').mockImplementation(jest.fn());
});

afterAll(done => {
    server.close();
    done();
});


describe('Eatery API', () => {
    test('Create Eatery', async () => {
        /*const response = await request(app)
            .post('/eatery')
            .set('cf-login', 'admin')
            .set('cf-password', 'admin')
            .send({
                name: 'Test Eatery',
                address: '123 Test St',
                phone: '+1234567890',
                email: 'test@example.com',
            });
        expect(response.status).toBe(201);
        expect(response.body.ok).toBe(true);
        expect(response.body.eatery).toBeDefined();
        expect(response.body.eatery.id).toBeDefined();
        firstEateryId = response.body.eatery.id;*/
    })
})