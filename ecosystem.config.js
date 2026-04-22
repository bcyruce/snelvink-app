module.exports = {
  apps: [
    {
      name: "snelvink",
      cwd: "/root/snelvink-app",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
