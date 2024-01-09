var config = {};

config.port = 3000; 

config.mysqlConfig = {
    host: 'mysql_server',
    user: 'user',
    password: 'secret',
    database: 'test_db',
};
config.rabbitMQConfig = {
    protocol: 'amqp',
    hostname: 'rabbitmq',
    port: 5672,
    username: 'guest',
    password: 'guest',
    vhost: '/',
};

module.exports = config;