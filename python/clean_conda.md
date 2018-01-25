# Conda
- remove: [link](https://stackoverflow.com/questions/42182706/how-to-uninstall-anaconda-completely)
- install: [link](https://conda.io/miniconda.html)

# Remove Pycharm
- remove: [link](https://askubuntu.com/questions/598162/how-to-permanently-remove-pycharm-community)
- install: [link](https://www.jetbrains.com/pycharm/download/#section=linux)

# Install packages in root
- `jupyter lab`: [link](https://github.com/jupyterlab/jupyterlab)
  - install first then run
- `ipython`
- `nb_conda_kernels`

# Create conda env
- as needed
- install ipykernel in env

# Install requirements
- `pip install -r requirements.txt`

---

# Clean your python environments

## Install & setup fish shell
- Install `fish`
```shell
sudo apt-add-repository ppa:fish-shell/release-2
sudo apt-get update
sudo apt-get install fish git
echo (which fish) | sudo tee -a /etc/shells
chsh -s (which fish)
git clone https://github.com/oh-my-fish/oh-my-fish
cd oh-my-fish
bin/install --offline
omf install bobthefish
wget https://github.com/ryanoasis/nerd-fonts/releases/download/v1.0.0/FiraCode.zip
sudo unzip FiraCode.zip -d /usr/local/share/fonts/
sudo fc-cache -fv
set -U theme_nerd_fonts yes
```
- setup oh-my-fish: [link](https://blog.devopscomplete.com/fishing-with-bob-the-fish-2decd3a2f87)

## Clean previous Python installation
- remove miniconda: [link](https://stackoverflow.com/questions/42182706/how-to-uninstall-anaconda-completely)
- remove pycharm: [link](https://askubuntu.com/questions/598162/how-to-permanently-remove-pycharm-community)

## Install python 3
- Follow the official recommandations: [link](http://docs.python-guide.org/en/latest/starting/install3/linux/)
```shell
sudo apt install software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.6
```

## Upgrade pip3
```shell
sudo -H pip install --upgrade pip
```

# Install pipenv
```shell
python3.6 -m pip install --user pipenv
```

## Create pipenv for each project
```shell
cd project
pipenv install
```

NOTE: to use matplotlib:
```shell
sudo apt-get install python3.6-tk
```
