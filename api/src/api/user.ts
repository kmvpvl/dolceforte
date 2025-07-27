import { Context } from 'openapi-backend';
import { Request, Response } from 'express';
import { User } from '../model/user';
import { DocumentError } from '../model/protodocument';
import { Types } from '../types/common';
import { randomUUID } from 'crypto';
import { notifyToolType } from '../types/user';

export async function newUser(c: Context, req: Request, res: Response) {
    const login = req.headers['cf-login'] as string;
    const password = req.headers['cf-password'] as string;
    const tguid = req.headers['cf-tguid'] as string;
    const tgcheckstring = req.headers['cf-tgquerycheckstring'] as string;
    const { photo, email } = req.body;
    let lgn: string;
    let psw: string;
    try {
        if (login === undefined && password === undefined) {
            if (tguid === undefined && tgcheckstring === undefined) throw new DocumentError(Types.DocumentErrorCode.parameter_expected, `Path '${req.path}' expects parameter 'password'`);
            lgn = `TG:${tguid}`;
            psw = randomUUID();
        } else {
            lgn = login;
            psw = password;
        }
        const hash = User.calcHash(lgn, psw);
        const user = new User({
            name: lgn,
            photo: photo,
            tguid: tguid,
            email: email,
            hash: hash,
            login: lgn, 
            settings: {
                notifications: {
                    tool: notifyToolType.email, // Default to email
                    events: {
                        signInSuccess: true,
                        signInFail: true,
                    }
                }
            },
            signInAttemptsCount: 0,
        });
        await user.save();
        return res.status(201).json({ ok: true, user: user.data });
    } catch (e: any) {
        if (e instanceof DocumentError) {
            return res.status(400).json({ ok: false, err: e.json });
        }
        return res.status(500).json({ ok: false, err: e.toString(), message: e.message });
    }
}

export async function viewUser(c: Context, req: Request, res: Response, user: User) {
    const id = req.body.id;
    if (id === undefined) {
        if (user !== undefined) return res.status(200).json({ ok: true, user: user.data });
        else return res.status(404).json({ ok: false, error: { code: -1, message: 'User not found' } });
    }
    try {
        const anUser = new User(id);
        await anUser.load();
        return res.status(200).json({ ok: true, user: anUser.data });
    } catch (e: any) {
        if (e instanceof DocumentError) return res.status(400).json({ ok: false, error: (e as DocumentError).json });
        return res.status(500).json({ ok: false, error: { message: e.message } });
    }
}