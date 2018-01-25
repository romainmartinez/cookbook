import os, time, pip

for package in pip.get_installed_distributions():
     print(f'{package}: {time.ctime(os.path.getctime(package.location))}')
