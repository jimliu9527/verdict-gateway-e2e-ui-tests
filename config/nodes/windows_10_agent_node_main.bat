@echo off
cd "C:\Users\Admin\Selenium"

start /min java -jar "C:\Users\Admin\Selenium\selenium-server-4.25.0.jar" node --hub http://192.158.10.117:4444 --config "windows_10_agent_node_main.toml"

exit