/* login routes */
import express from 'express';
import { printlog } from './../utils/helpers';
import bcrypt from 'bcrypt';
import session from 'express-session';
import shortid from 'shortid';
import randomColor from 'randomcolor';

const router = express.Router();

router.post('/', (req, res, next) => {
  const { db } = res;
  printlog('POST /login', 'route');
  const { pwd, email } = req.body;

  // TODO: add middleware auth here
  db.getPassword({tableName: 'users', key: 'email', val: email})
  .then((user) => {
    const {id, password, email, username } = user;
    const hash = password;

    // Load hash from your password DB.
    bcrypt.compare(pwd, hash, (err, resp) => {
      if (resp) {

        if (typeof req.session.uid === 'undefined') {
          req.session.uid = id; //shortid.generate();
          req.session.name = username || email;
          req.session.isAdmin = true;
          const hexcolor = randomColor({
            luminosity: 'dark',
            hue: 'random'
          });
          console.log(`'${hexcolor}'`)
          req.session.color = `${hexcolor}`;

          // async update last login date
          db.updateLoginDate(id);
        }

        printlog(`${pwd}=${hash} -> ${resp}`);

        // allow page to render before emitting data that user joined
        // this will be refactored once we attach sessions to socket
        setTimeout(() => {
          res.io.emit('news', { hello: `${req.session.name} joined.` });
        }, 500);

        let idHash = `${req.session.uid}`;
        return res.status(200).json(idHash);
      } else {
        printlog(`Password '${pwd}' does not match.`, 'error');
        return res.status(401).json({
          error: 'Wrong password. Try again.'
        });
      }
    });
  })
  .catch((error) => {
    printlog(error, 'error');
    return res.status(401).json({
      error: 'Sorry, we do not recognize that email.'
    });
  });
});

export default router;