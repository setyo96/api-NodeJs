const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const db = require('../connection')
const contentFile = require('../data/content.json');
require('dotenv').config(); 

const app = express();
const port = 3000;

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

app.get('/api/get-otp', (req, res) => {
    const dataArray = []
    db.query("SELECT * FROM table_otp", (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({
                Resp_get_otp: {
                    status: {
                        code: 500,
                        message: 'Internal Server Error',
                    },
                },
            });
            return;
        }

        result.forEach(row => {
            dataArray.push(row);
        });
        
        const now = new Date();
        const timeCriteria = new Date(now.getTime() - 60000);
        const filteredArray = dataArray.filter(row => new Date(row.time) >= timeCriteria);
        let responseData = null;
        let data_length = filteredArray.length;
        
        if (data_length !== 0) {
            responseData = {
                otp_val: filteredArray[data_length-1].otp,
                time: formatDate(filteredArray[data_length-1].time),
            };
        }

        const respGetOTP = {
            Resp_get_otp: {
                status: {
                    code: 0,
                    message: 'Success',
                },
                data: responseData,
            },
        };

        res.status(200).json(respGetOTP.Resp_get_otp);
    })
});

app.post('/api/send-otp', bodyParser.json(), (req, res) => {
  const { val_otp } = req.body;

  if (val_otp) {
    const now = new Date();
    const time = formatDate(now);

    db.query("INSERT INTO table_otp (otp, time) VALUES (?, ?)", [val_otp, time], (error, result) => {
        if (error) {
            console.error('Error inserting data into table_otp:', error);
            res.status(500).json({
                status: {
                    code: 1,
                    message: 'Internal Server Error',
                },
            });
        } else {
            responseData = {
                otp_val: val_otp,
                time: time,
            };
            const respSendOTP = {
                Resp_send_otp: {
                    status: {
                        code: 0,
                        message: 'Success',
                    },
                    data: responseData,
                },
            };
            res.status(200).json(respSendOTP.Resp_send_otp);
        }
    });
  } else {
    const respInvalid = {
      Resp_invalid_parameter: {
        Status: {
          Code: 1,
          Message: 'Invalid Request Body',
        },
      },
    };

    res.status(400).json(respInvalid.Resp_invalid_parameter);
  }
});

app.get('/api/content', (req, res) => {
    const { pageName, key } = req.query;
    filteredData = contentFile.content_array.filter(item => {
        const pageNameMatch = !pageName || item.pageName === pageName;
        const keyMatch = !key || item.key === key;
        return pageNameMatch && keyMatch;
    });

    const respGetContent = {
        Resp_get_content: {
            status: {
                code: 0,
                message: 'Success',
            },
            data: filteredData,
        },
    };

    res.status(200).json(respGetContent.Resp_get_content);
})

app.post('/api/send-wa-dg',bodyParser.json(), (req, res) => {
    const { val_message, val_phoneNumber } = req.body;
    const token = 'yP6E5SFThY1w77eGR5S6'; 
    // const phoneNumber = '6287778360195-1545882126@g.us';
    // const phoneNumber = '6285951391878'
    const countryCode = '62';

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({
            status: {
                code: 401,
                message: 'Unauthorized: No or invalid Authorization header provided',
            },
        });
    }

    // Decode the base64 encoded username:password from the Authorization header
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Replace these with your actual username and password
    const validUsername = process.env.VALID_USERNAME;
    const validPassword = process.env.VALID_PASSWORD;

    if (username !== validUsername || password !== validPassword) {
        return res.status(401).json({
            status: {
                code: 401,
                message: 'Unauthorized: Invalid username or password',
            },
        });
    }

    if (val_message) {
        const options = {
            method: 'post',
            mode: 'cors',
            url: 'https://api.fonnte.com/send',
            headers: {
            'Authorization': token
            },
            data: {
                target: val_phoneNumber,
                message: val_message,
                countryCode: countryCode
            }
        };

        axios.request(options)
            .then(response => {
                const respSendWA_success = {
                    Resp_send_wa: {
                        status: {
                            code: 0,
                            message: 'Success',
                        },
                        data: response.data.detail,
                    },
                };
                res.status(200).json(respSendWA_success.Resp_send_wa);
            })
            .catch(error => {
                const respSendWA_success = {
                    Resp_send_wa: {
                        status: {
                            code: 0,
                            message: 'Failed',
                        },
                        data: error,
                    },
                };
                res.status(500).json(respSendWA_success.Resp_send_wa);
            });
    } else {
        const respInvalid = {
            Resp_invalid_parameter: {
                Status: {
                Code: 1,
                Message: 'Invalid Request Body',
                },
            },
        };
    
        res.status(400).json(respInvalid.Resp_invalid_parameter);
    }
})
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
