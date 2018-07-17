# Clean your python environments

## Optionnal: Install & setup fish shell
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

NOTE: `echo $SHELL` should return `/usr/bin/fish`

## Clean previous Python installation
- see pip history: `run pip_history.py`
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

## Install pip3
```shell
sudo apt install python3-pip
sudo -H pip3 install --upgrade pip
```

## Install pipenv
```shell
python3.6 -m pip install --user pipenv
PYTHON_BIN_PATH="$(python3 -m site --user-base)/bin"
PATH="$PATH:$PYTHON_BIN_PATH"
```

## Create pipenv for each project
```shell
cd project
pipenv install
```
NOTE: if you want to use jupyterlab

```shell
pip install --user jupyterlab
cd project
pipenv install ipykernel
pipenv shell
python -m ipykernel install --user --name mvc
```

NOTE: to remove unused kernel
```shell
jupyter kernelspec list
jupyter kernelspec remove project
```

NOTE: to use matplotlib:
```shell
sudo apt-get install python3.6-tk
```

## Jupyter Notebook Extension
- Hinterland (autocompletion)
- NBextensions dashboard tab
- Runtools
- contrib_nbextensions_help_item
- NBextensions edit menu item
- Table of Contents (2)
- code prettify (pipenv install yapf)
