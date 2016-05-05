DROP DATABASE MyHaremList;

CREATE DATABASE MyHaremList CHARACTER SET 'utf8';
USE MyHaremList;
CREATE TABLE users
(
 userId int UNSIGNED NOT NULL AUTO_INCREMENT,
 email varchar(63) NOT NULL UNIQUE,
 nickName varchar(30) NOT NULL UNIQUE,
 passWord varchar(63) NOT NULL,
 gender varchar(7) NOT NULL,
 birth DATE NOT NULL,
 pictPath varchar(144) DEFAULT NULL,
 biography varchar(144) DEFAULT NULL,
 sudo BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY (userId)
)
ENGINE=INNODB;

CREATE TABLE univers
(
 universId int UNSIGNED NOT NULL AUTO_INCREMENT,
 universName varchar(144) NOT NULL,
 PRIMARY KEY (universId)
)
ENGINE=INNODB;

CREATE TABLE charac
(
 charId int UNSIGNED NOT NULL AUTO_INCREMENT,
 charName varchar(63) NOT NULL,
 alterNames varchar(144),
 charGender Varchar(7) NOT NULL,
 charDesc varchar(666),
 universId int UNSIGNED NOT NULL,
 PRIMARY KEY (charId),
 FOREIGN KEY (universId) REFERENCES univers(universId)
)
ENGINE=INNODB;

INSERT INTO users (email,nickname,passWord,gender,birth,sudo)
    VALUES('fournier.clt@gmail.com','Phyras','lolilol','Husband',"1995-11-09",TRUE);
INSERT INTO univers (universName) VALUES ("Fate/Stay");
INSERT INTO charac (charName,alterNames,charGender,charDesc,universId)
    VALUES ("Saber","Arthuria, Arthur, King of Knights, SABAAA.","Waifu","A virgin king carving for redemption",1);